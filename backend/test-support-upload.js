const fs = require("fs");
const path = require("path");

const FILE_PATH = "E:\\Downloads\\m.png";
const API_URL = "http://localhost:3000";
const TICKET_ID = 1;

async function main() {
  if (!fs.existsSync(FILE_PATH)) {
    throw new Error(`File not found: ${FILE_PATH}`);
  }

  const loginResponse = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "sadrafayyaz9@gmail.com",
        password: "sadrafayyaz1390",
      }),
    }
  );

  const loginData =
    await loginResponse.json();

  if (
    !loginResponse.ok ||
    !loginData.success ||
    !loginData.data?.token
  ) {
    throw new Error(
      `Login failed: ${JSON.stringify(
        loginData,
        null,
        2
      )}`
    );
  }

  const token =
    loginData.data.token;

  console.log("Login: OK");

  const form = new FormData();

  form.append(
    "message",
    "This is an image attachment test."
  );

  const fileBuffer =
    fs.readFileSync(FILE_PATH);

  const blob = new Blob(
    [fileBuffer],
    {
      type: "image/png",
    }
  );

  form.append(
    "file",
    blob,
    path.basename(FILE_PATH)
  );

  const uploadResponse =
    await fetch(
      `${API_URL}/api/support/tickets/${TICKET_ID}/messages`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },

        body: form,
      }
    );

  const uploadText =
    await uploadResponse.text();

  console.log(
    "HTTP Status:",
    uploadResponse.status
  );

  console.log(
    "Upload Response:"
  );

  try {
    console.log(
      JSON.stringify(
        JSON.parse(uploadText),
        null,
        2
      )
    );
  } catch {
    console.log(uploadText);
  }

  if (!uploadResponse.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    "Test failed:"
  );

  console.error(
    error.message
  );

  process.exitCode = 1;
});