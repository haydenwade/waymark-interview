import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { tmpdir } from "os";
import path from "path";
import { pipeline } from "stream/promises";

const REGION = "us-west-1";
const QUEUE_URL = process.env.SQS_QUEUE_URL; //TODO: Move to config
const s3 = new S3Client({ region: REGION }); //TODO: Move to config
const sqs = new SQSClient({ region: REGION }); //TODO: Move to config

async function transcodeAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("aac")
      .audioBitrate("256k")
      .audioChannels(2)
      .audioFrequency(48000)
      .format("ipod") // for .m4a with AAC
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
}

async function handleMessage(message) {
  let parsed;
  try {
    parsed = JSON.parse(message.Body);
  } catch (err) {
    console.error("Failed to parse message body:", message.Body);
    throw err;
  }

  const record = parsed?.Records?.[0];
  if (!record || !record.s3) {
    throw new Error("Invalid S3 event structure");
  }

  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " ")); // S3 encoding fix
  const fileId = path.basename(key, path.extname(key)); // "6811188929fe0e69d4a2319a"
  const inputPath = path.join(tmpdir(), path.basename(key));
  const outputKey = `processed/${fileId}_browser.m4a`;
  const outputPath = path.join(tmpdir(), `${fileId}_browser.m4a`);

  // 1. Download original
  const s3Object = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  await pipeline(s3Object.Body, fs.createWriteStream(inputPath));

  // 2. Transcode
  await transcodeAudio(inputPath, outputPath);

  // 3. Upload result
  const fileBuffer = fs.readFileSync(outputPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: outputKey,
      Body: fileBuffer,
      ContentType: "audio/mp4",
    })
  );

  // 4. Cleanup
  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);

  console.log(`Successfully processed and uploaded ${outputKey}`);
}

async function pollQueue() {
  console.log("Polling for messages...");
  const res = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10,
    })
  );

  if (res.Messages) {
    for (const message of res.Messages) {
      try {
        await handleMessage(message);
        await sqs.send(
          new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          })
        );
        console.log(`Processed: ${message.MessageId}`);
      } catch (err) {
        console.error(`Failed to process message ${message.MessageId}:`, err);
      }
    }
  }

  // Poll again
  setTimeout(pollQueue, 1000);
}

pollQueue().catch(console.error);
