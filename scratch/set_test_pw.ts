import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

async function setPassword() {
  const hash = await bcrypt.hash("Password123!", 10);
  await db.user.update({
    where: { email: "tejhorw0001@gmail.com" },
    data: { passwordHash: hash },
  });
  console.log("Password successfully updated to Password123!");
}

setPassword().catch(console.error);
