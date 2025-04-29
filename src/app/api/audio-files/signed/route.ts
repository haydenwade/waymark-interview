import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MongoClient, ObjectId } from 'mongodb';

const s3 = new S3Client({
  region: 'us-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = 'waymark-audio-uploads-dev'; // TODO: move to config
const FOLDER = 'uploads/';
const MONGODB_URI = process.env.MONGODB_URI!; // TODO: move to config
const MONGODB_DB = process.env.MONGODB_DB || 'waymark-dev'; // TODO: move to config

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    const fileExt = filename.split('.').pop();
    const fileId = new ObjectId();
    const key = `${FOLDER}${fileId}.${fileExt}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

    // ✅ Save document to MongoDB
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    const audioFiles = db.collection('audioFiles');

    await audioFiles.insertOne({
      _id: fileId,
      filename,
      key,
      contentType,
      createdAt: Date.now(),
      status: 'queued',
    });

    await client.close();

    return NextResponse.json({
      fileId:fileId.toString(),
      uploadUrl,
    });
  } catch (error) {
    console.error('Error generating signed URL:', error); // TODO: replace with logger
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
