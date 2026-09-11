const prisma = require("../src/prisma");

const EMAIL = "sadrafayyaz9@gmail.com";

async function main() {
  const user = await prisma.user.findUnique({
    where: {
      email: EMAIL,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error(`User not found: ${EMAIL}`);
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      role: "SUPER_ADMIN",
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  await prisma.wallet.upsert({
    where: {
      userId: updatedUser.id,
    },
    create: {
      userId: updatedUser.id,
    },
    update: {},
  });

  console.log("SUPER_ADMIN assigned successfully:");
  console.log(updatedUser);
}

main()
  .catch((error) => {
    console.error(
      "Failed to assign SUPER_ADMIN:",
      error.message || error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });