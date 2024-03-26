let detector;
let detectorConfig;
let poses;
let video;
let skeleton = true;
let model;
let elbowAngle = 999;
let backAngle = 0;
let reps = 0;
let upPosition = false;
let downPosition = false;
let highlightBack = false;
let backWarningGiven = false;
let curlReady = false;
let inCurl = false;

async function init() {
  detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
  };
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    detectorConfig
  );
  edges = {
    "5,7": "m",
    "7,9": "m",
    "6,8": "c",
    "8,10": "c",
    "5,6": "y",
    "5,11": "m",
    "6,12": "c",
    "11,12": "y",
    "11,13": "m",
    "13,15": "m",
    "12,14": "c",
    "14,16": "c",
    "5,9": "y",
    "6,10": "y",
  };
  await getPoses();
}

async function videoReady() {
  //console.log('video ready');
}

async function setup() {
  var msg = new SpeechSynthesisUtterance("Loading, please wait...");
  window.speechSynthesis.speak(msg);
  createCanvas(640, 480);
  video = createCapture(VIDEO, videoReady);
  //video.size(960, 720);
  video.hide();

  await init();
}

async function getPoses() {
  poses = await detector.estimatePoses(video.elt);
  setTimeout(getPoses, 0);
  // console.log(poses);
}

function draw() {
  background(220);
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, video.width, video.height);

  // Draw keypoints and skeleton
  drawKeypoints();
  if (skeleton) {
    drawSkeleton();
  }

  // Write text
  fill(255);
  strokeWeight(2);
  stroke(51);
  translate(width, 0);
  scale(-1, 1);
  textSize(40);

  if (poses && poses.length > 0) {
    leftWrist = poses[0].keypoints[9];
    leftShoulder = poses[0].keypoints[5];
    leftElbow = poses[0].keypoints[7];
    checkKeypts = [leftWrist, leftShoulder, leftElbow];
    //check if keypoints are visible on camera
    for (let kp of checkKeypts) {
      if (kp.x >= 0 && kp.x < 640 && kp.y >= 0 && kp.y < 480) {
        console.log(kp.x, kp.y);
        let pushupString = `Bicep Curls: ${reps}`;
        text(pushupString, 100, 90);
      }
    }
  } else {
    text("Loading, please wait...", 100, 90);
  }
}

function drawKeypoints() {
  var count = 0;
  if (poses && poses.length > 0) {
    for (let kp of poses[0].keypoints) {
      const { x, y, score } = kp;
      if (score > 0.3) {
        count = count + 1;
        fill(255);
        stroke(0);
        strokeWeight(4);
        circle(x, y, 16);
      }
      if (count == 17) {
        //console.log('Whole body visible!');
      } else {
        //console.log('Not fully visible!');
      }
      updateArmAngle();
      inReadyPosition();
      inCurlPosition();
    }
  }
}

// Draws lines between the keypoints
function drawSkeleton() {
  confidence_threshold = 0.5;

  if (poses && poses.length > 0) {
    for (const [key, value] of Object.entries(edges)) {
      const p = key.split(",");
      const p1 = p[0];
      const p2 = p[1];

      const y1 = poses[0].keypoints[p1].y;
      const x1 = poses[0].keypoints[p1].x;
      const c1 = poses[0].keypoints[p1].score;
      const y2 = poses[0].keypoints[p2].y;
      const x2 = poses[0].keypoints[p2].x;
      const c2 = poses[0].keypoints[p2].score;

      if (c1 > confidence_threshold && c2 > confidence_threshold) {
        if (
          highlightBack == true &&
          (p[1] == 11 || (p[0] == 6 && p[1] == 12) || p[1] == 13 || p[0] == 12)
        ) {
          strokeWeight(3);
          stroke(255, 0, 0);
          line(x1, y1, x2, y2);
        } else {
          strokeWeight(2);
          stroke("rgb(0, 255, 0)");
          line(x1, y1, x2, y2);
        }
      }
    }
  }
}

function updateArmAngle() {
  leftWrist = poses[0].keypoints[9];
  leftShoulder = poses[0].keypoints[5];
  leftElbow = poses[0].keypoints[7];

  angle =
    (Math.atan2(leftWrist.y - leftElbow.y, leftWrist.x - leftElbow.x) -
      Math.atan2(leftShoulder.y - leftElbow.y, leftShoulder.x - leftElbow.x)) *
    (180 / Math.PI);

  if (angle < 0) {
    //angle = angle + 360;
  }

  if (
    leftWrist.score > 0.3 &&
    leftElbow.score > 0.3 &&
    leftShoulder.score > 0.3
  ) {
    // console.log(angle);
    elbowAngle = angle;
  } else {
    //console.log('Cannot see elbow');
  }
}


function inReadyPosition() {
  // console.log(curlReady, elbowAngle);
  if (elbowAngle > 150) {
    console.log("inCurl", inCurl);
    if (inCurl == true) {
      reps += 1;
    }
    curlReady = true;
    inCurl = false;
  }
}

function inCurlPosition() {
  let shoulder = [poses[0].keypoints[5].x, poses[0].keypoints[5].y];
  let elbow = [poses[0].keypoints[7].x, poses[0].keypoints[7].y];
  let wrist = [poses[0].keypoints[9].x, poses[0].keypoints[9].y];

  var wristAboveElbow = false;
  if (wrist[1] < elbow[1]) {
    wristAboveElbow = true;
    // console.log(wristAboveElbow, angle);
  }
  if (wristAboveElbow && angle < 45) {
    inCurl = true;
    curlReady = false;
  }
}

function calculateAngle(shoulder, elbow, wrist) {
  // Calculate vectors for shoulder to elbow and elbow to wrist
  let shoulderToElbow = [elbow[0] - shoulder[0], elbow[1] - shoulder[1]];
  let elbowToWrist = [wrist[0] - elbow[0], wrist[1] - elbow[1]];

  // Calculate dot product and magnitudes of vectors
  let dotProduct =
    shoulderToElbow[0] * elbowToWrist[0] + shoulderToElbow[1] * elbowToWrist[1];
  let shoulderToElbowMagnitude = Math.sqrt(
    shoulderToElbow[0] ** 2 + shoulderToElbow[1] ** 2
  );
  let elbowToWristMagnitude = Math.sqrt(
    elbowToWrist[0] ** 2 + elbowToWrist[1] ** 2
  );

  // Calculate the cosine of the angle using dot product and magnitudes
  let cosineAngle =
    dotProduct / (shoulderToElbowMagnitude * elbowToWristMagnitude);

  // Calculate the angle in radians
  let angleRadians = Math.acos(cosineAngle);

  // Convert angle from radians to degrees
  let angleDegrees = angleRadians * (180 / Math.PI);

  return angleDegrees;
}
