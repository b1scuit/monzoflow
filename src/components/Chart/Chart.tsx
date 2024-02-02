import { FC } from "react";
import { scaleOrdinal } from "d3";
import { SankeyLinkMinimal, SankeyNode, sankey, sankeyCenter, sankeyLinkHorizontal } from "d3-sankey";

const MARGIN_Y = 25;
const MARGIN_X = 5;
const COLORS = ["#e0ac2b", "#e85252", "#6689c6", "#9a6fb0", "#a53253"];

export type Node = {
    id: string,
    description: string 
}

export type Link = {
    source: string; target: string; value: number
}


export type ChartProps = {
    width: number
    height: number
    data: Data
}

export type Data = {
    nodes: Node[]
    links: Link[];
};

export const Chart: FC<ChartProps> = ({ width, height, data }) => {
    const allGroups = [...new Set(data.nodes.map((d) => d.description))].sort();
    const colorScale = scaleOrdinal<string>().domain(allGroups).range(COLORS);

    const sanKeyGenerator = sankey<Node, Link>()
        .nodeWidth(26)
        .nodePadding(29)
        .nodeId((node) => node.id) 
        .extent([
            [MARGIN_X, MARGIN_Y],
            [width - MARGIN_X, width - MARGIN_Y],
        ])
        .nodeAlign(sankeyCenter)

    const { nodes, links } = sanKeyGenerator(data);

    const allNodes = nodes.map((node: any) => {
        return (
            <g key={node.index}>
                <rect
                    height={node.y1 - node.y0}
                    width={sanKeyGenerator.nodeWidth()}
                    x={node.x0}
                    y={node.y0}
                    stroke={"black"}
                    fillOpacity={1}
                    rx={0.9}
                />
            </g>
        );
    });

    const allLinks = links.map((link, i) => {
        const linkGenerator = sankeyLinkHorizontal();
        const path = linkGenerator(link);

        return (
            <path
                key={i}
                d={path as string}
                stroke={colorScale(link.source as string)}
                fill="none"
                strokeOpacity={0.3}
                strokeWidth={link.width}
            />
        );
    });

    const allLabels = nodes.map((node: SankeyNode<Node, {}>, i: number) => {
        const calcX = (): string | number | undefined => {
            if (node.x0 && node.x1) {
                return node.x0 < width / 2 ? node.x1 + 6 : node.x0 - 6
            }
        } 

        const calcY = (): string | number | undefined => {
            if (node.y0 && node.y1) {
                return (node.y1 + node.y0) / 2
            }
        }

        const textAnchor = ():  "start" | "end" | undefined => {
            if (node.x0) {
                return (node.x0 < width / 2 ? "start" : "end")
            }
        }

        return (node && <text
                key={i}
                x={calcX()}
                y={calcY()}
                dy="0.35rem"
                textAnchor={textAnchor()}
                fontSize={12}
            >
                {node.description}
            </text>
        );
    });

    return <svg width={width} height={height}>
        {allLinks}
        {allNodes}
        {allLabels}
    </svg>
};