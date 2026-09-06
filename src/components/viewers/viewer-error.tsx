import { Component, type ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';

export function ViewerError({ message }: { message: string }) {
  return <EmptyState icon="warning-outline" title="Lecture impossible" hint={message} />;
}

interface BoundaryProps {
  children: ReactNode;
}
interface BoundaryState {
  message: string | null;
}

/** Isole un lecteur : un fichier corrompu ne doit pas planter l'app. */
export class ViewerBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.message != null) {
      return <ViewerError message={this.state.message} />;
    }
    return this.props.children;
  }
}
