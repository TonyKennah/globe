import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";

function App() {
	// A reference to the canvas element where we'll render the globe
	const canvasRef = useRef<HTMLCanvasElement>(null);
	// The number of markers we're currently displaying
	const [counter, setCounter] = useState(0);
	// A map of marker IDs to their positions
	// Note that we use a ref because the globe's `onRender` callback
	// is called on every animation frame, and we don't want to re-render
	// the component on every frame.
	const positions = useRef<
		Map<
			string,
			{
				location: [number, number];
				size: number;
			}
		>
	>(new Map());
	// Connect to the PartyServer server
	const socket = usePartySocket({
		room: "default",
		party: "globe",
		onMessage(evt) {
			const message = JSON.parse(evt.data as string) as OutgoingMessage;
			if (message.type === "add-marker") {
				// Add the marker to our map
				positions.current.set(message.position.id, {
					location: [message.position.lat, message.position.lng],
					size: message.position.id === socket.id ? 0.1 : 0.05,
				});
				// Update the counter
				setCounter((c) => c + 1);
			} else {
				// Remove the marker from our map
				positions.current.delete(message.id);
				// Update the counter
				setCounter((c) => c - 1);
			}
		},
	});

	// Add a ref to hold the current dragging position at the top of your component
	const pointerRef = useRef<{ x: number; y: number } | null>(null);

	useEffect(() => {
		if (!canvasRef.current) return;

		let phi = 0;
		// Track the current theta value so it can be changed by dragging vertically
		let currentTheta = 0.4;

		const globe = createGlobe(canvasRef.current, {
			devicePixelRatio: 2,
			width: 400 * 2,
			height: 400 * 2,
			phi: 0,
			theta: currentTheta,
			dark: 1,
			diffuse: 1.2,
			mapSamples: 16000,
			mapBrightness: 6,
			baseColor: [0.0, 0.8, 0.3],
			glowColor: [0.1, 0.4, 0.9],
			markerColor: [1.0, 0.1, 0.1],
			markers: [],
			opacity: 0.9,
			onRender: (state) => {
				state.markers = [...positions.current.values()];

				// If the user isn't dragging, auto-rotate slowly
				if (!pointerRef.current) {
					phi += 0.005; // Made auto-rotation slightly slower for a better feel
				}

				state.phi = phi;
				state.theta = currentTheta;
			},
		});

		// Mouse and Touch Interaction Handlers
		const canvas = canvasRef.current;

		const handlePointerDown = (e: PointerEvent) => {
			pointerRef.current = { x: e.clientX, y: e.clientY };
			canvas.style.cursor = "grabbing";
		};

		const handlePointerMove = (e: PointerEvent) => {
			if (!pointerRef.current) return;

			// Calculate how far the mouse has moved
			const deltaX = e.clientX - pointerRef.current.x;
			const deltaY = e.clientY - pointerRef.current.y;

			// Update the coordinate references
			pointerRef.current = { x: e.clientX, y: e.clientY };

			// Adjust sensitivity by dividing the delta
			phi += deltaX / 200;
			currentTheta = Math.max(-0.8, Math.min(0.8, currentTheta + deltaY / 200));
		};

		const handlePointerUp = () => {
			pointerRef.current = null;
			canvas.style.cursor = "grab";
		};

		// Attach listeners to the canvas
		canvas.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			globe.destroy();
			canvas.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, []);


	return (
		<div className="App">
			<h1>Where are you?</h1>
			{counter !== 0 ? (
				<p>
					<b>{counter}</b> {counter === 1 ? "person" : "people"} connected.
				</p>
			) : (
				<p>&nbsp;</p>
			)}

			{/* The canvas where we'll render the globe */}
			<canvas
				ref={canvasRef}
				style={{ width: 400, height: 400, maxWidth: "100%", aspectRatio: 1 }}
			/>
		</div>
	);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
