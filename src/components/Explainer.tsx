import React from 'react';

const STEPS: { title: string; body: string }[] = [
  {
    title: 'i. energy map',
    body: 'Each pixel gets an energy value — roughly, how much it differs from its neighbors. High energy means an edge; low energy means smooth texture. The Sobel gradient makes this explicit.',
  },
  {
    title: 'ii. cost matrix',
    body: 'A dynamic-programming pass accumulates energy top-to-bottom: each cell stores the cheapest path from the top edge to itself. The bottom row now tells us the cost of every possible seam.',
  },
  {
    title: 'iii. seam',
    body: 'Starting from the cheapest cell in the bottom row, we walk back up the stored parent pointers. That trace is the lowest-energy seam — the pixels we can remove with the least visible damage.',
  },
  {
    title: 'iv. remove and repeat',
    body: "We delete those pixels, shift the image one column narrower, and run the whole thing again. Hundreds of iterations later, we've shed a lot of width without stretching or cropping anything the eye cares about.",
  },
];

export default function Explainer() {
  return (
    <section className="explainer">
      <div className="explainer-label">how seam carving works</div>
      {STEPS.map((step) => (
        <div className="explainer-step" key={step.title}>
          <div className="explainer-step-title">{step.title}</div>
          <div className="explainer-step-body">{step.body}</div>
        </div>
      ))}
    </section>
  );
}
