import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function NodeNetworkVisualization({ nodes = [] }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const width = ref.current.clientWidth || 500;
    const height = 290;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const graphNodes = [{ id: "TX", type: "tx" }, ...nodes.map((node) => ({ id: node.nodeId, type: "node" }))];
    const links = nodes.map((node) => ({ source: "TX", target: node.nodeId }));

    const simulation = d3
      .forceSimulation(graphNodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(95))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g")
      .attr("stroke", "#60a5fa")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2);

    const node = svg.append("g").selectAll("g").data(graphNodes).join("g");

    node
      .append("circle")
      .attr("r", (d) => (d.type === "tx" ? 20 : 14))
      .attr("fill", (d) => (d.type === "tx" ? "#f59e0b" : "#22d3ee"));

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-size", 9)
      .attr("fill", "#0b1020")
      .text((d) => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes]);

  return (
    <section className="panel p-4 md:p-6">
      <h2 className="mb-2 text-lg font-semibold text-slate-100">Validator Network (Advanced)</h2>
      <p className="mb-4 text-xs text-slate-400">Broadcast flow from transaction origin to validator nodes.</p>
      <svg ref={ref} className="h-[290px] w-full rounded-lg border border-slate-700 bg-slate-900/75" />
    </section>
  );
}
