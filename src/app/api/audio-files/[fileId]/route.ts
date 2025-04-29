import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DB || "waymark-dev"; // TODO: move to config

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params; // ✅ await params
    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json({ error: "Invalid fileId" }, { status: 400 });
    }

    const { version, progress, errors } = await req.json();
    if (!version || !progress) {
      return NextResponse.json(
        { error: "Missing version or progress" },
        { status: 400 }
      );
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    const audioFiles = db.collection("audioFiles"); // TODO: move to config

    const update: any = {
      $set: {
        [`versions.${version}.status`]: progress,
      },
    };

    if (errors && Array.isArray(errors)) {
      update.$set[`versions.${version}.errors`] = errors;
    }

    // ✅ Add processedUrl if progress is "completed"
    if (progress === "completed") {
      update.$set[
        `versions.${version}.processedUrl`
      ] = `https://waymark-audio-uploads-dev.s3.us-west-1.amazonaws.com/processed/${fileId}_${version}.m4a`;
    }

    const result = await audioFiles.updateOne(
      { _id: new ObjectId(fileId) },
      update
    );

    await client.close();

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to patch audio file status:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
