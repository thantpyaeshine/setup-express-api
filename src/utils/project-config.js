import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";

const MINIMUM_PACKAGE_VERSION = "0.1.0";

function toPackageName(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function compareVersions(left, right) {
    const parseParts = (value) =>
        String(value ?? "0")
            .split("-")[0]
            .split(".")
            .map((part) => Number.parseInt(part, 10) || 0);

    const leftParts = parseParts(left);
    const rightParts = parseParts(right);
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index += 1) {
        const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
        if (difference !== 0) {
            return difference;
        }
    }

    return 0;
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

async function askPackageVersion(prompt) {
    let version = await ask(prompt, "Version", MINIMUM_PACKAGE_VERSION);
    while (compareVersions(version, MINIMUM_PACKAGE_VERSION) < 0) {
        console.log(`Version must be ${MINIMUM_PACKAGE_VERSION} or higher.`);
        version = await ask(prompt, "Version", MINIMUM_PACKAGE_VERSION);
    }
    return version;
}

export async function promptForProjectConfig(targetDir) {
    const prompt = readline.createInterface({ input, output });
    const defaultName = toPackageName(path.basename(targetDir)) || "express-api-server";

    try {
        console.log("\nCreate an Express API\n");
        return {
            name: await askPackageName(prompt, defaultName),
            version: await askPackageVersion(prompt),
            description: await ask(prompt, "Description"),
            author: await ask(prompt, "Author"),
            license: await ask(prompt, "License", "MIT")
        };
    } finally {
        prompt.close();
    }
}