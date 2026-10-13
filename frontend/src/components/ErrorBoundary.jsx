import { Component } from 'react'
import { phoneTel, site } from '../config/site'

/** Last line of defence: a crash in any page shows this instead of a blank screen. */
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('Unexpected error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="container page">
        <div className="state" role="alert">
          <h1 className="state-title">Something went wrong</h1>
          <p>
            Sorry about that. Please reload the page. If it keeps happening, call us on{' '}
            <a href={phoneTel}>{site.phone}</a>.
          </p>
          <div className="state-actions">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <a className="btn btn-ghost" href="/">
              Go to home page
            </a>
          </div>
        </div>
      </div>
    )
  }
}
