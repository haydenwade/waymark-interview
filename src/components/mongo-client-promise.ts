import { MongoClient } from "mongodb";
const MONGODB_URI = process.env.MONGODB_URI!; // TODO: move to config

declare const global: {
  _mongoClientPromise: Promise<MongoClient>;
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!global._mongoClientPromise) {
  client = new MongoClient(MONGODB_URI);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default clientPromise;
