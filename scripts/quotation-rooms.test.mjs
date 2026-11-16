import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext } from "react-hook-form";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const filename = path.resolve("src/features/quotation/QuotationBuilder.tsx");
const source = fs.readFileSync(filename, "utf8");
const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "HotelSelection");
assert.ok(component, "HotelSelection must remain covered by the room rendering regression");
const compiled = ts.transpileModule(`${component.getText(ast)}\nexports.HotelSelection = HotelSelection;`, {
	compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
const exports = {};
const element = tag => ({ children, ...props }) => React.createElement(tag, props, children);
vm.runInNewContext(compiled.outputText, {
	exports, require, React, Controller, useFieldArray, useFormContext,
	FieldSet: element("fieldset"), FieldLegend: element("legend"), FieldDescription: element("p"),
	FieldGroup: element("div"), Card: element("section"), Field: element("div"),
	FieldLabel: element("label"), Input: element("input"), FieldError: () => null,
	Checkbox: ({ checked, onCheckedChange, ...props }) => React.createElement("button", { ...props, role: "checkbox", "aria-checked": checked }),
	Button: element("button"),
}, { filename });

function render(selectedRooms, rooms) {
	function Form() {
		const methods = useForm({ defaultValues: { selected_rooms: selectedRooms } });
		return React.createElement(FormProvider, methods,
			React.createElement(exports.HotelSelection, { selectedPackage: { rooms } }));
	}
	return renderToStaticMarkup(React.createElement(Form));
}

const rooms = [
	{ room_type: "Quad", price: 1500, enabled: false },
	{ room_type: "Double", price: 1800, enabled: true },
];

test("saved disabled room shows its quoted price, passenger count, charge, and removal control", () => {
	const selected = [{ room_type: "Quad", price: 1200, pax: 2 }, { room_type: "Double", price: 1800, pax: 1 }];
	const html = render(selected, rooms);
	assert.match(html, /room-Quad/);
	assert.match(html, /Unavailable/);
	assert.match(html, /RM 1,200/);
	assert.match(html, /id="pax-Quad"[^>]*value="2"/);
	assert.match(html, /RM 2,400/);
	assert.match(html, /Remove Quad/);
	assert.match(html, /replace/i);
	assert.match(html, /room-Double/);
	assert.deepEqual(selected, [{ room_type: "Quad", price: 1200, pax: 2 }, { room_type: "Double", price: 1800, pax: 1 }]);
});

test("removed unavailable rooms cannot be selected again", () => {
	const html = render([{ room_type: "Double", price: 1800, pax: 1 }], rooms);
	assert.doesNotMatch(html, /room-Quad|pax-Quad|Remove Quad/);
	assert.match(html, /room-Double/);
});

test("saved room absent from current options stays visible for an explicit decision", () => {
	const html = render([{ room_type: "Quad", price: 1200, pax: 2 }], rooms.filter(room => room.room_type !== "Quad"));
	assert.match(html, /room-Quad/);
	assert.match(html, /RM 1,200/);
	assert.match(html, /Unavailable/);
	assert.match(html, /Remove Quad/);
});

test("enabled room keeps its entered price when the package price changes", () => {
	const html = render([{ room_type: "Double", price: 1700, pax: 2 }], rooms);
	assert.match(html, /Entered price RM 1,700 retained/);
	assert.match(html, /Remove and select this room again to use the current price/);
	assert.match(html, /id="pax-Double"[^>]*value="2"/);
});
