import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";

function toPackageName(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

async function ask(prompt, question, defaultValue = "") {
    const suffix = defaultValue ? ` (${defaultValue})` : "";
    const answer = await prompt.question(`${question}${suffix}: `);
    return answer.trim() || defaultValue;
}

async function askPackageName(prompt, defaultValue) {
    let packageName = toPackageName(await ask(prompt, "Package name", defaultValue));
    while (!packageName) {
        console.log("Package name must include at least one letter or number.");
        packageName = toPackageName(await ask(prompt, "Package name", defaultValue));
    }
    return packageName;
}

export async function promptForProjectConfig(targetDir) {
    const prompt = readline.createInterface({ input, output });
    const defaultName = toPackageName(path.basename(targetDir)) || "express-api-server";

    try {
        console.log("\nCreate an Express API\n");
        return {
            name: await askPackageName(prompt, defaultName),
            description: await ask(prompt, "Description"),
            author: await ask(prompt, "Author"),
            license: await ask(prompt, "License", "MIT")
        };
    } finally {
        prompt.close();
    }
}