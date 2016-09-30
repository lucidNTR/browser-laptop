/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const React = require('react')
const ImmutableComponent = require('./immutableComponent')

const cx = require('../lib/classSet')
const Button = require('./button')
const UrlBar = require('./urlBar')
const windowActions = require('../actions/windowActions')
const settings = require('../constants/settings')
const ipc = global.require('electron').ipcRenderer
const {isSourceAboutUrl} = require('../lib/appUrlUtil')
const siteUtil = require('../state/siteUtil')
const eventUtil = require('../lib/eventUtil')
const getSetting = require('../settings').getSetting
const windowStore = require('../stores/windowStore')

class NavigationBar extends ImmutableComponent {
  constructor () {
    super()
    this.onNoScript = this.onNoScript.bind(this)
  }

  get activeFrame () {
    return windowStore.getFrame(this.props.activeFrameKey)
  }

  get loading () {
    return this.props.activeFrameKey !== undefined && this.props.loading
  }

  get titleMode () {
    return this.props.mouseInTitlebar === false &&
      this.props.title &&
      !this.props.navbar.getIn(['urlbar', 'focused']) &&
      !this.props.navbar.getIn(['urlbar', 'active']) &&
      getSetting(settings.DISABLE_TITLE_MODE) === false
  }

  get showNoScriptInfo () {
    return this.props.enableNoScript && this.props.scriptsBlocked && this.props.scriptsBlocked.size
  }

  onNoScript () {
    windowActions.setNoScriptVisible(!this.props.noScriptIsVisible)
  }

  componentDidUpdate (prevProps) {
    if (this.props.noScriptIsVisible && !this.showNoScriptInfo) {
      // There are no blocked scripts, so hide the noscript dialog.
      windowActions.setNoScriptVisible(false)
    }
  }

  render () {
    if (this.props.activeFrameKey === undefined) {
      return null
    }

    return <div id='navigator'
      ref='navigator'
      data-frame-key={this.props.activeFrameKey}
      className={cx({
        titleMode: this.titleMode
      })}>
      <UrlBar ref='urlBar'
        sites={this.props.sites}
        activeFrameKey={this.props.activeFrameKey}
        searchDetail={this.props.searchDetail}
        loading={this.loading}
        location={this.props.location}
        suggestionIndex={this.props.suggestionIndex}
        title={this.props.title}
        history={this.props.history}
        isSecure={this.props.isSecure}
        locationValueSuffix={this.props.locationValueSuffix}
        startLoadTime={this.props.startLoadTime}
        endLoadTime={this.props.endLoadTime}
        titleMode={this.titleMode}
        urlbar={this.props.navbar.get('urlbar')}
        />
      {
        isSourceAboutUrl(this.props.location)
        ? <div className='endButtons'>
          <span className='browserButton' />
        </div>
        : <div className='endButtons'>
          {
            !this.showNoScriptInfo
            ? null
            : <Button iconClass='fa-ban'
              l10nId='noScriptButton'
              className={cx({
                'noScript': true
              })}
              onClick={this.onNoScript} />
          }
        </div>
      }
    </div>
  }
}

module.exports = NavigationBar
