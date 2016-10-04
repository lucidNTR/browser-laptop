/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const React = require('react')

const ImmutableComponent = require('./immutableComponent')

const windowActions = require('../actions/windowActions')
const dragTypes = require('../constants/dragTypes')
const cx = require('../lib/classSet')
const {getTextColorForBackground} = require('../lib/color')
const {isIntermediateAboutPage} = require('../lib/appUrlUtil')

const contextMenus = require('../contextMenus')
const dnd = require('../dnd')
const windowStore = require('../stores/windowStore')
const {getBase64FromImageUrl} = require('../lib/imageUtil')

class Tab extends ImmutableComponent {
  constructor () {
    super()
    this.onMouseEnter = this.onMouseEnter.bind(this)
    this.onMouseLeave = this.onMouseLeave.bind(this)
  }
  get frame () {
    return windowStore.getFrame(this.props.tab.get('frameKey'))
  }

  get isPinned () {
    return !!this.props.tab.get('pinnedLocation')
  }

  get draggingOverData () {
    if (!this.props.draggingOverData ||
        this.props.draggingOverData.get('dragOverKey') !== this.props.tab.get('frameKey')) {
      return
    }

    const sourceDragData = dnd.getInProcessDragData()
    const location = sourceDragData.get('location')
    const key = this.props.draggingOverData.get('dragOverKey')
    const draggingOverFrame = windowStore.getFrame(key)
    if ((location === 'about:blank' || location === 'about:newtab' || isIntermediateAboutPage(location)) &&
        (draggingOverFrame && draggingOverFrame.get('pinnedLocation'))) {
      return
    }

    return this.props.draggingOverData
  }

  get isDragging () {
    const sourceDragData = dnd.getInProcessDragData()
    return sourceDragData && this.props.tab.get('frameKey') === sourceDragData.get('key')
  }

  get isDraggingOverLeft () {
    if (!this.draggingOverData) {
      return false
    }
    return this.draggingOverData.get('draggingOverLeftHalf')
  }

  get isDraggingOverRight () {
    if (!this.draggingOverData) {
      return false
    }
    return this.draggingOverData.get('draggingOverRightHalf')
  }

  get displayValue () {
    // YouTube tries to change the title to add a play icon when
    // there is audio. Since we have our own audio indicator we get
    // rid of it.
    return (this.props.tab.get('title') ||
      this.props.tab.get('location')).replace('▶ ', '')
  }

  onDragStart (e) {
    dnd.onDragStart(dragTypes.TAB, this.frame, e)
  }

  onDragEnd (e) {
    dnd.onDragEnd(dragTypes.TAB, this.frame, e)
  }

  onDragOver (e) {
    dnd.onDragOver(dragTypes.TAB, this.tabNode.getBoundingClientRect(), this.props.tab.get('frameKey'), this.draggingOverData, e)
  }

  setActiveFrame (event) {
    event.stopPropagation()
    windowActions.setActiveFrame(this.frame)

    if (this.frame.get('location') === 'about:newtab') {
      windowActions.setUrlBarActive(true)
      windowActions.setUrlBarFocused(true)
      windowActions.setUrlBarSelected(false)
    }
  }

  onCloseFrame (event) {
    event.stopPropagation()
    windowActions.closeFrame(windowStore.getFrames(), this.frame)
  }

  onMuteFrame (muted, event) {
    event.stopPropagation()
    windowActions.setAudioMuted(this.frame, muted)
  }

  get loading () {
    return this.frame &&
    this.props.tab.get('loading') &&
    (!this.props.tab.get('provisionalLocation') ||
    !this.props.tab.get('provisionalLocation').startsWith('chrome-extension://mnojpmjdmbbfmejpflffifhffcmidifd/'))
  }

  onMouseLeave () {
    window.clearTimeout(this.hoverTimeout)
    windowActions.setPreviewFrame(null)
  }

  onMouseEnter (e) {
    // relatedTarget inside mouseenter checks which element before this event was the pointer on
    // if this element has a tab-like class, then it's likely that the user was previewing
    // a sequency of tabs. Called here as previewMode.
    const previewMode = /tab(?!pages)/i.test(e.relatedTarget.classList)

    // If user isn't in previewMode, we add a bit of delay to avoid tab from flashing out
    // as reported here: https://github.com/brave/browser-laptop/issues/1434
    this.hoverTimeout =
      window.setTimeout(windowActions.setPreviewFrame.bind(null, this.frame), previewMode ? 0 : 200)
  }

  onClickTab (e) {
    // Middle click should close tab
    if (e.button === 1) {
      this.onCloseFrame(e)
    } else {
      this.setActiveFrame(e)
    }
  }

  render () {
    // setup style constants
    const iconSize = 16
    let iconStyle = {
      minWidth: iconSize,
      width: iconSize
    }
    const activeTabStyle = {}

    // load the cache for the current domain
      // TODO: JSON.stringify()
      // TODO: iconURL
      // TODO: const age = 1 // in days
      // TODO: cache cleanup & refresh & reuse cache per domain image & handle dynamic favicons
    const locationKey = 'styleCache_' + window.btoa(new window.URL(this.frame.get('location')).host)
    const cacheData = window.localStorage.getItem(locationKey)

    let cacheIcon
    let cacheColor

    if (cacheData) {
      const parsed = JSON.parse(cacheData)
      cacheIcon = parsed.cacheIcon
      cacheColor = parsed.cacheColor
    }

    // setup the theme color
    const backgroundColor =
      this.props.paintTabs &&
      (this.props.tab.get('themeColor') || this.props.tab.get('computedThemeColor'))

    if (this.props.isActive && cacheColor) {
      activeTabStyle.background = cacheColor
      const textColor = getTextColorForBackground(cacheColor)
      iconStyle.color = textColor
      if (textColor) {
        activeTabStyle.color = getTextColorForBackground(cacheColor)
      }
    } else if (this.props.isActive && backgroundColor) {
      activeTabStyle.background = backgroundColor
      const textColor = getTextColorForBackground(backgroundColor)
      iconStyle.color = textColor
      if (textColor) {
        activeTabStyle.color = getTextColorForBackground(backgroundColor)
      }
      cacheColor = backgroundColor
    }

    // Setup the icon
    const iconUrl = this.props.tab.get('icon')

    if (iconUrl && !cacheIcon) {
      getBase64FromImageUrl(iconUrl).then((data) => {
        window.localStorage.setItem(locationKey, JSON.stringify({ cacheIcon: data, cacheColor }))
      })

      iconStyle = Object.assign(iconStyle, {
        backgroundImage: `url(${iconUrl})`,
        backgroundSize: iconSize,
        height: iconSize
      })
    } else if (cacheIcon) {
      iconStyle = Object.assign(iconStyle, {
        backgroundImage: `url(${cacheIcon})`,
        backgroundSize: iconSize,
        height: iconSize
      })
    } else {
      iconStyle = Object.assign(iconStyle, {
        className: 'fa fa-file',
        backgroundSize: iconSize,
        height: iconSize
      })
    }

    // setup play state
    let playIcon = null
    if (this.props.tab.get('audioPlaybackActive') || this.props.tab.get('audioMuted')) {
      playIcon = <span className={cx({
        audioPlaybackActive: true,
        fa: true,
        'fa-volume-up': this.props.tab.get('audioPlaybackActive') &&
          !this.props.tab.get('audioMuted'),
        'fa-volume-off': this.props.tab.get('audioPlaybackActive') &&
          this.props.tab.get('audioMuted')
      })}
        onClick={this.onMuteFrame.bind(this, !this.props.tab.get('audioMuted'))} />
    }

    return <div
      className={cx({
        tabArea: true,
        draggingOverLeft: this.isDraggingOverLeft,
        draggingOverRight: this.isDraggingOverRight,
        isDragging: this.isDragging,
        isPinned: this.isPinned,
        minTab: (this.isPinned || this.props.minTabs),
        partOfFullPageSet: this.props.partOfFullPageSet
      })}
      onMouseEnter={this.props.previewTabs ? this.onMouseEnter : null}
      onMouseLeave={this.props.previewTabs ? this.onMouseLeave : null}>
      <div className={cx({
        tab: true,
        isPinned: this.isPinned,
        minTab: (this.isPinned || this.props.minTabs),
        active: this.props.isActive,
        private: this.props.tab.get('isPrivate')
      })}
        data-frame-key={this.props.tab.get('frameKey')}
        ref={(node) => { this.tabNode = node }}
        draggable
        title={this.props.tab.get('title')}
        onDragStart={this.onDragStart.bind(this)}
        onDragEnd={this.onDragEnd.bind(this)}
        onDragOver={this.onDragOver.bind(this)}
        onClick={this.onClickTab.bind(this)}
        onContextMenu={contextMenus.onTabContextMenu.bind(this, this.frame)}
        style={activeTabStyle}>
        {
          this.props.tab.get('isPrivate')
          ? <div className='privateIcon fa fa-eye' />
          : null
        }
        {
          this.props.tab.get('partitionNumber')
          ? <div data-l10n-args={JSON.stringify({partitionNumber: this.props.tab.get('partitionNumber')})}
            data-l10n-id='sessionInfoTab'
            className='privateIcon fa fa-user' />
          : null
        }
        <div className={cx({
          tabIcon: true,
          'loading fa': this.loading
        })}
          style={iconStyle} />
        {playIcon}
        {
          !this.isPinned
          ? <div className='tabTitle'>
            {this.displayValue}
          </div>
          : null
        }
        {
          !this.isPinned
          ? <span onClick={this.onCloseFrame.bind(this)}
            data-l10n-id='closeTabButton'
            className='closeTab fa fa-times-circle' />
          : null
        }
      </div>
    </div>
  }
}

module.exports = Tab
