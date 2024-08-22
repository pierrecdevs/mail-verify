import EmailVerifier from "./services/EmailVerifier";

export const main = async () => {
  const [node, script, email] = process.argv;
  try {
    const results = await EmailVerifier.verify(email);
    console.info(results);
  } catch (err) {
    console.error(err); 
  }
}

main();
