export function checkPricingRow(root = document) {
	const header = [...root.querySelectorAll('div')].find(el => el.textContent.trim() === 'PAKEJ/BILIK');
	if (!header) throw new Error('Pricing header missing');
	const table = header.closest('.mt-3').firstElementChild;
	const cells = [...table.querySelectorAll('.border-b')];
	const boxes = cells.map(cell => cell.getBoundingClientRect());
	const near = (a, b) => Math.abs(a - b) < 0.5;
	const transfer = table.nextElementSibling;
	const aligned = boxes.length >= 3 && boxes.every((box, i) =>
		near(box.top, boxes[0].top) && near(box.bottom, boxes[0].bottom) &&
		near(box.bottom, transfer.getBoundingClientRect().top) &&
		(i === 0 || near(box.left, boxes[i - 1].right)) &&
		getComputedStyle(cells[i]).borderBottomWidth !== '0px');
	const total = cells.at(-1);
	const totalBox = boxes.at(-1);
	const followupTotals = [...table.parentElement.children].slice(1).map(row => row.lastElementChild);
	const totalsAligned = followupTotals.every(cell => {
		const box = cell.getBoundingClientRect();
		return near(box.left, totalBox.left) && near(box.right, totalBox.right);
	});
	return {
		pass: aligned && totalsAligned && getComputedStyle(total).backgroundColor !== 'rgba(0, 0, 0, 0)',
		heights: boxes.map(box => box.height),
		bottoms: boxes.map(box => box.bottom),
		totalsAligned,
		values: cells.map(cell => cell.textContent.trim()),
	};
}
