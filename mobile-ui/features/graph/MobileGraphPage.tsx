import {
  GraphWorkspace,
  type GraphWorkspaceProps,
} from "../../../shared/features/graph/GraphWorkspace";
import "./graph.css";
export function MobileGraphPage(props: GraphWorkspaceProps) {
  return (
    <GraphWorkspace
      {...props}
      render={({ header, body, panel, footer }) => (
        <section className="graph-workspace graph-mobile">
          {header}
          <div className="graph-body">
            {body}
            {panel}
          </div>
          {footer}
        </section>
      )}
    />
  );
}
