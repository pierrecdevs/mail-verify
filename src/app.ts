import EmailVerifier from "./services/EmailVerifier";

export const app = async () => {
  const [,, email] = process.argv;
  try {
    const results = await EmailVerifier.verify(email);
    console.info(results);
  } catch (err) {
    console.error(err);
  }
}

app();
