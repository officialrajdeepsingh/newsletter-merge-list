#!/usr/bin/env node

const { execFileSync } = require("node:child_process");

const { defaultFrom, defaultTo } = getDefaultTuesdayRangeUtc();
const DEFAULT_REPOS = [
	"tailwindlabs/tailwindcss.com",
	"tailwindlabs/tailwindcss",
	"mdn/content",
	"reactjs/react.dev",
	"facebook/react",
	"vercel/next.js",
];

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
	printHelp();
	process.exit(0);
}

const repoInput = getArgValue("--repo");
const state = getArgValue("--state") || "merged";

const fromInput = getArgValue("--from") || defaultFrom;
const toInput = getArgValue("--to") || defaultTo;

const fromDate = new Date(fromInput);
const toDate = new Date(toInput);

if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
	console.error("Invalid date. Use ISO format, e.g. 2026-04-14T00:00:00Z");
	process.exit(1);
}

if (fromDate > toDate) {
	console.error("Invalid range: --from must be before --to");
	process.exit(1);
}

const repos = repoInput ? [repoInput] : DEFAULT_REPOS;

const prs = [];

for (const repo of repos) {
	const ghArgs = [
		"pr",
		"list",
		"--state",
		state,
		"--limit",
		"50",
		"--json",
		"number,title,author,createdAt,updatedAt,state,url",
		"--repo",
		repo,
	];

	try {
		const output = execFileSync("gh", ghArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
		const repoPrs = JSON.parse(output);

		for (const pr of repoPrs) {
			prs.push({ ...pr, repo });
		}
	} catch (error) {
		console.error(`Failed to run gh command for ${repo}. Ensure GitHub CLI is installed and authenticated.`);
		if (error?.stderr) {
			console.error(String(error.stderr).trim());
		} else if (error?.message) {
			console.error(error.message);
		}
		process.exit(1);
	}
}

const filtered = prs
	.filter((pr) => {
		const created = new Date(pr.createdAt);
		return created >= fromDate && created <= toDate;
	})
	.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

console.log(
	`PRs from ${fromDate.toISOString()} to ${toDate.toISOString()}${repoInput ? ` in ${repoInput}` : ` across ${repos.length} repos`}: ${filtered.length}`,
);

for (const pr of filtered) {
	console.log(
		`- ${pr.repo}#${pr.number} [${pr.state}] ${pr.title} | @${pr.author?.login ?? "unknown"} | created: ${pr.createdAt} | ${pr.url}`,
	);
}

function getArgValue(name) {
	const index = args.indexOf(name);
	if (index === -1) {
		return undefined;
	}

	return args[index + 1];
}

function printHelp() {
	console.log(`Usage:
	node merge.js [--repo owner/name] [--state open|closed|merged|all] [--from ISO_DATE] [--to ISO_DATE]

Default repositories:
	${DEFAULT_REPOS.join("\n\t")}

Default date range (dynamic UTC, previous Tuesday to current Tuesday):
	--from ${defaultFrom}
	--to   ${defaultTo}

Examples:
	node merge.js --repo octocat/Hello-World
	node merge.js --repo octocat/Hello-World --state merged
	node merge.js --repo octocat/Hello-World --from 2026-04-28T00:00:00.000Z --to 2026-05-05T23:59:59.999Z
`);
}

function getDefaultTuesdayRangeUtc() {
	const now = new Date();
	const todayStartUtc = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
	);

	const day = todayStartUtc.getUTCDay();
	const tuesday = 2;
	const daysSinceTuesday = (day - tuesday + 7) % 7;

	const currentTuesdayStart = new Date(todayStartUtc);
	currentTuesdayStart.setUTCDate(currentTuesdayStart.getUTCDate() - daysSinceTuesday);

	const previousTuesdayStart = new Date(currentTuesdayStart);
	previousTuesdayStart.setUTCDate(previousTuesdayStart.getUTCDate() - 7);

	const currentTuesdayEnd = new Date(currentTuesdayStart);
	currentTuesdayEnd.setUTCHours(23, 59, 59, 999);

	return {
		defaultFrom: previousTuesdayStart.toISOString(),
		defaultTo: currentTuesdayEnd.toISOString(),
	};
}
