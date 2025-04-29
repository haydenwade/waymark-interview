import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!; // TODO: move to config
const MONGODB_DB = process.env.MONGODB_DB || "waymark-dev"; // TODO: move to config

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params; // ✅ await params
    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json({ error: "Invalid fileId" }, { status: 400 });
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    const audioFiles = db.collection("audioFiles"); // TODO: move to config

    const voiceover = await audioFiles.findOne({ _id: new ObjectId(fileId) });
    await client.close();

    if (!voiceover) {
      return NextResponse.json(
        { error: "Voiceover not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: voiceover._id.toString(),
      versions: voiceover.versions,
      createdAt: voiceover.createdAt,
      filename: voiceover.filename,
    });
  } catch (err) {
    console.error("Failed to fetch voiceover status:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
