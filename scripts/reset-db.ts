import { DB_URL } from "../src/server/instance";
import { openDatabase } from "../src/server/db";
import { resetDatabase } from "../src/server/seed";

async function main() {
  const db = await openDatabase(DB_URL, process.env.TURSO_AUTH_TOKEN);
  await resetDatabase(db);
  db.close();
  console.log(`Reset and re-seeded ${DB_URL.startsWith("file:") ? DB_URL : "the Turso database"}`);
}

main();
