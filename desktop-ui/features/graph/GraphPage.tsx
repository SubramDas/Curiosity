import {
  GraphWorkspace,
  type GraphWorkspaceProps,
} from "../../../shared/features/graph/GraphWorkspace";
import "./graph.css";
export function GraphPage(props: GraphWorkspaceProps) {
  return (
    <GraphWorkspace
      {...props}
      render={({ header, body, panel, footer }) => (
        <section className="graph-workspace graph-desktop">
          {header}
          <div className="graph-body">
            <div>{body}</div>
            {panel}
          </div>
          {footer}
        </section>
      )}
    />
  );
}
