import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "../..");
const inventory = JSON.parse(fs.readFileSync(path.join(directory, "coverage.json"), "utf8"));
const failures = [];
const read = (file) => fs.readFileSync(path.resolve(root, file), "utf8");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
	const full = path.join(dir, entry.name);
	return entry.isDirectory() ? walk(full) : [full];
});
const relative = (file) => path.relative(root, file);
const expectSame = (label, actual, recorded) => {
	const wanted = new Set(recorded);
	for (const value of actual) if (!wanted.delete(value)) failures.push(`${label}: unrecorded ${value}`);
	for (const value of wanted) failures.push(`${label}: stale ${value}`);
	if (new Set(recorded).size !== recorded.length) failures.push(`${label}: duplicate entries`);
};

const routes = walk(path.join(root, "src/app"))
	.filter((file) => /\/(page|route)\.tsx?$/.test(file)).map(relative).sort();
expectSame("routes", routes, inventory.routes.map((item) => item.source));
for (const entry of inventory.routes) {
	const route = "/" + entry.source.replace(/^src\/app\//, "").replace(/\/(page|route)\.tsx?$/, "")
		.replace(/^(page|route)\.tsx?$/, "").split("/").filter((part) => !/^\(.+\)$/.test(part)).join("/");
	if (route !== entry.route) failures.push(`route URL differs: ${entry.source}`);
}

const operations = [];
for (const file of walk(path.join(root, "convex")).filter((file) => file.endsWith(".ts") && !file.includes("/_generated/"))) {
	const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
	for (const statement of source.statements) {
		if (!ts.isVariableStatement(statement) || !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (!declaration.initializer || !ts.isCallExpression(declaration.initializer)) continue;
			const kind = declaration.initializer.expression.getText(source);
			if (/^(query|mutation|action|internalQuery|internalMutation|internalAction|httpAction)$/.test(kind)) {
				operations.push(`${path.basename(file, ".ts")}:${declaration.name.getText(source)}`);
			} else if (kind === "convexAuth" && ts.isObjectBindingPattern(declaration.name)) {
				for (const element of declaration.name.elements) {
					if (element.name.getText(source) !== "auth") operations.push(`auth:${element.name.getText(source)}`);
				}
			}
		}
	}
}
expectSame("operations", operations.sort(), inventory.operations.map((item) => item.name));

const headings = (source) => {
	const ids = [...source.matchAll(/<a\s+id="([^"]+)"/g)].map((match) => match[1]);
	const occurrences = new Map();
	for (const match of source.matchAll(/^#{1,6}\s+(.+)$/gm)) {
		const base = match[1].replace(/[`*_]/g, "").toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, "").replace(/ /g, "-");
		const count = occurrences.get(base) ?? 0;
		ids.push(count ? `${base}-${count}` : base);
		occurrences.set(base, count + 1);
	}
	return ids;
};
const checkLink = (from, target) => {
	if (/^(https?:|mailto:|data:)/.test(target)) return;
	const [destination, hash] = target.replace(/^<|>$/g, "").split("#");
	const full = destination ? path.resolve(path.dirname(from), decodeURI(destination)) : from;
	if (!fs.existsSync(full)) { failures.push(`missing link in ${path.basename(from)}: ${target}`); return; }
	if (!hash || !fs.statSync(full).isFile()) return;
	const contents = fs.readFileSync(full, "utf8");
	if (/^L\d+(?:-L\d+)?$/.test(hash)) {
		if (Number(hash.match(/\d+/)[0]) > contents.split("\n").length) failures.push(`line beyond source in ${target}`);
	} else if (full.endsWith(".md") && !headings(contents).includes(decodeURI(hash))) {
		failures.push(`missing anchor in ${path.basename(from)}: ${target}`);
	}
};
const docs = walk(directory).filter((file) => file.endsWith(".md"));
let links = 0;
let diagrams = 0;
const features = new Map();
for (const file of docs) {
	const source = fs.readFileSync(file, "utf8");
	for (const id of source.matchAll(/<a\s+id="([a-z]+-\d+)"/g)) {
		if (features.has(id[1])) failures.push(`duplicate feature ID: ${id[1]}`);
		features.set(id[1], relative(file));
	}
	diagrams += [...source.matchAll(/^```mermaid\s*$/gm)].length;
	let start = 0;
	while ((start = source.indexOf("](", start)) !== -1) {
		let cursor = start + 2;
		let depth = 1;
		for (; cursor < source.length && depth; cursor++) {
			if (source[cursor] === "(") depth++;
			if (source[cursor] === ")") depth--;
		}
		if (depth) { failures.push(`unclosed Markdown link in ${path.basename(file)}`); break; }
		checkLink(file, source.slice(start + 2, cursor - 1));
		links++;
		start = cursor;
	}
}
for (const entry of [...inventory.routes, ...inventory.operations]) {
	if (!entry.features?.length) failures.push(`no feature mapping: ${entry.source ?? entry.name}`);
	for (const feature of entry.features ?? []) {
		if (!/\.md#[a-z]+-\d+$/.test(feature)) failures.push(`mapping needs a feature ID: ${entry.source ?? entry.name}`);
		checkLink(path.join(directory, "coverage.md"), feature);
	}
}
const summary = { routes: routes.length, operations: operations.length, featureIds: features.size, documents: docs.length, links, diagrams, failures };
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
