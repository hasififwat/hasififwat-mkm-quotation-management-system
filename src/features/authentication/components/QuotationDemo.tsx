"use client";

import { BedDouble, Check, FileText, Pause, Plane, Play } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatCurrency } from "~/features/quotation/utils";
import styles from "./QuotationDemo.module.css";

const sample = {
	packageName: "12-day Umrah",
	destinations: "Madinah & Makkah",
	passengers: 2,
	pricePerPassenger: 7900,
};
const price = formatCurrency(sample.pricePerPassenger);
const total = formatCurrency(sample.passengers * sample.pricePerPassenger);

const steps = [
	{
		label: "Package",
		title: "Choose a package",
		description: "Start with a package and its itinerary.",
		duration: 3000,
		visual: (
			<div className={styles.details}>
				<div className={styles.selected}>
					<div>
						<p className="font-semibold">{sample.packageName}</p>
						<p className="text-xs text-muted-foreground">{sample.destinations}</p>
					</div>
					<Check aria-hidden="true" className="size-4 shrink-0 text-primary" />
				</div>
				<p className="flex items-center gap-2 border-t px-3 py-2.5 text-xs text-muted-foreground">
					<Plane aria-hidden="true" className="size-3.5 shrink-0" />
					Kuala Lumpur to Madinah
				</p>
			</div>
		),
	},
	{
		label: "Pricing",
		title: "Price the room",
		description: "Choose a room, enter the price, and set the passenger count.",
		duration: 3600,
		visual: (
			<div className={styles.details}>
				<p className="flex items-center gap-2 border-b px-3 py-2.5 text-sm font-semibold">
					<BedDouble aria-hidden="true" className="size-4 shrink-0 text-primary" />
					Double room
				</p>
				<dl className={styles.summary}>
					<div>
						<dt>Passengers</dt>
						<dd>{sample.passengers} adults</dd>
					</div>
					<div>
						<dt>Price per person</dt>
						<dd>{price}</dd>
					</div>
				</dl>
			</div>
		),
	},
	{
		label: "Review",
		title: "Review the quotation",
		description: "Check the package details and the total for your client.",
		duration: 4800,
		visual: (
			<div className={styles.details}>
				<p className="flex items-center gap-2 border-b px-3 py-2.5 text-sm font-semibold">
					<FileText aria-hidden="true" className="size-4 shrink-0 text-primary" />
					{sample.packageName}
				</p>
				<dl className={styles.summary}>
					<div>
						<dt>Travellers</dt>
						<dd>{sample.passengers} adults</dd>
					</div>
					<div>
						<dt>Quotation total</dt>
						<dd className={styles.total}>{total}</dd>
					</div>
				</dl>
			</div>
		),
	},
] as const;

const motionPreference = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
	const query = window.matchMedia(motionPreference);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

export function QuotationDemo() {
	const [stepIndex, setStepIndex] = useState(0);
	const [playback, setPlayback] = useState<"system" | "playing" | "paused">("system");
	const [visible, setVisible] = useState(false);
	const demo = useRef<HTMLElement>(null);
	const reduceMotion = useSyncExternalStore(
		subscribeToMotion,
		() => window.matchMedia(motionPreference).matches,
		() => true,
	);
	const playing = playback === "playing" || (playback === "system" && !reduceMotion);
	const step = steps[stepIndex];

	useEffect(() => {
		const element = demo.current;
		if (!element) return;

		const observer = new IntersectionObserver(([entry]) => setVisible(entry.intersectionRatio >= 0.2), {
			threshold: 0.2,
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!playing || !visible) return;

		const timer = window.setTimeout(
			() => setStepIndex((current) => (current + 1) % steps.length),
			steps[stepIndex].duration,
		);
		return () => window.clearTimeout(timer);
	}, [playing, visible, stepIndex]);

	return (
		<section ref={demo} aria-labelledby="quotation-demo-title" className={styles.demo}>
			<header className={styles.header}>
				<FileText aria-hidden="true" className="size-4 shrink-0 text-primary" />
				<h2 id="quotation-demo-title" className="font-semibold">Quotation demo</h2>
				<span className={styles.sampleLabel}>Sample</span>
				<button
					type="button"
					className={styles.playback}
					aria-label={playing ? "Pause demo" : "Play demo"}
					onClick={() => setPlayback(playing ? "paused" : "playing")}
				>
					{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
				</button>
			</header>
			<div className={styles.body}>
				<div key={step.label} className={styles.stage}>
					<h3 className={styles.title}>{step.title}</h3>
					<p className={styles.description}>{step.description}</p>
					{step.visual}
				</div>
			</div>
			<div role="group" aria-label="Quotation demo steps" className={styles.steps}>
				{steps.map(({ label, duration }, index) => (
					<button
						key={label}
						type="button"
						aria-pressed={stepIndex === index}
						data-autoplay={stepIndex === index && playing && visible}
						style={{ "--step-duration": `${duration}ms` } as CSSProperties}
						onClick={() => {
							setStepIndex(index);
							setPlayback("paused");
						}}
					>
						<span aria-hidden="true">{index + 1}</span>
						{label}
					</button>
				))}
			</div>
		</section>
	);
}
