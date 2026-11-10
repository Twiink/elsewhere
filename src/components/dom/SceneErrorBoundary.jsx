import { Component } from 'react';
import LoadingFailure from './LoadingFailure';

export default class SceneErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <LoadingFailure /> : this.props.children; }
}
