import { Browser, isBrowser } from './browser'
import { Selectors } from './selectors'
import { Defaults } from './defaults'

// Firefox extensions doesn't allow 'innerHTML' to be set but we can trick it
// + aid for minifiers not to remove the trick
const FF_EXTENSION_TRICK = { x: true }

/**
 * Injects a string of CSS styles to the style node in the document head
 */
export const injectCSS = css => {
  if (isBrowser && Browser.isSupported) {
    const head = document.head || document.querySelector('head')
    const style = document.createElement('style')
    style.type = 'text/css'
    head.insertBefore(style, head.firstChild)

    if (style.styleSheet) {
      style.styleSheet.cssText = css
    } else {
      style.appendChild(document.createTextNode(css))
    }
  }
}

/**
 * Ponyfill for Array.from; converts iterable values to an array
 */
export const toArray = value => [].slice.call(value)

/**
 * Sets an attribute on an element; aids in minification
 */
export const setAttr = (el, attr, value = '') => {
  el.setAttribute(attr, value)
}

/**
 * Sets the content of a tooltip
 */
export const setContent = (contentEl, props) => {
  if (props.content instanceof Element) {
    contentEl.appendChild(props.content)
  } else {
    contentEl[props.allowHTML ? 'innerHTML' : 'textContent'] = props.content
  }
}

/**
 * Determines if an element can receive focus
 */
export const elementCanReceiveFocus = el =>
  el instanceof Element
    ? matches.call(
        el,
        'a[href],area[href],button,details,input,textarea,select,iframe,[tabindex]'
      ) && !el.hasAttribute('disabled')
    : true

/**
 * Applies a transition duration to a list of elements
 */
export const applyTransitionDuration = (els, value) => {
  els.filter(Boolean).forEach(el => {
    el.style[prefix('transitionDuration')] = `${value}ms`
  })
}

/**
 * Returns the child elements of a popper element
 */
export const getChildren = popper => {
  const select = s => popper.querySelector(s)
  return {
    tooltip: select(Selectors.TOOLTIP),
    backdrop: select(Selectors.BACKDROP),
    content: select(Selectors.CONTENT),
    arrow: select(Selectors.ARROW) || select(Selectors.ROUND_ARROW)
  }
}

/**
 * Determines if a value is a plain object
 */
export const isPlainObject = value =>
  ({}.toString.call(value) === '[object Object]')

/**
 * Creates and returns a div element
 */
export const div = () => document.createElement('div')

/**
 * Sets the innerHTML of an element while tricking linters & minifiers
 */
export const setInnerHTML = (el, html) => {
  el[FF_EXTENSION_TRICK.x && 'innerHTML'] =
    html instanceof Element ? html[FF_EXTENSION_TRICK.x && 'innerHTML'] : html
}

/**
 * Returns an array of elements based on the value
 */
export const getArrayOfElements = value => {
  if (value instanceof Element || isPlainObject(value)) {
    return [value]
  }
  if (value instanceof NodeList) {
    return toArray(value)
  }
  if (Array.isArray(value)) {
    return value
  }

  try {
    return toArray(document.querySelectorAll(value))
  } catch (e) {
    return []
  }
}

/**
 * Determines if a value is numeric
 */
export const isNumeric = value => !isNaN(value) && !isNaN(parseFloat(value))

/**
 * Returns a value at a given index depending on if it's an array or number
 */
export const getValue = (value, index, defaultValue) => {
  if (Array.isArray(value)) {
    const v = value[index]
    return v === null ? defaultValue : v
  }
  return value
}

/**
 * Constructs the popper element and returns it
 */
export const createPopperElement = (id, props) => {
  const popper = div()
  popper.className = 'tippy-popper'
  popper.role = 'tooltip'
  popper.id = `tippy-${id}`
  popper.style.zIndex = props.zIndex

  const tooltip = div()
  tooltip.className = 'tippy-tooltip'
  setAttr(tooltip, 'data-size', props.size)
  setAttr(tooltip, 'data-animation', props.animation)
  setAttr(tooltip, 'data-state', 'hidden')
  props.theme.split(' ').forEach(t => {
    tooltip.classList.add(t + '-theme')
  })

  const content = div()
  content.className = 'tippy-content'

  if (props.interactive) {
    setAttr(popper, 'tabindex', '-1')
    setAttr(tooltip, 'data-interactive')
  }

  if (props.arrow) {
    const arrow = div()
    if (props.arrowType === 'round') {
      arrow.className = 'tippy-roundarrow'
      setInnerHTML(
        arrow,
        '<svg viewBox="0 0 24 8" xmlns="http://www.w3.org/2000/svg"><path d="M3 8s2.021-.015 5.253-4.218C9.584 2.051 10.797 1.007 12 1c1.203-.007 2.416 1.035 3.761 2.782C19.012 8.005 21 8 21 8H3z"/></svg>'
      )
    } else {
      arrow.className = 'tippy-arrow'
    }
    tooltip.appendChild(arrow)
  }

  if (props.animateFill) {
    const backdrop = div()
    backdrop.className = 'tippy-backdrop'
    setAttr(backdrop, 'data-state', 'hidden')
    setAttr(tooltip, 'data-animatefill')
    tooltip.appendChild(backdrop)
  }

  if (props.inertia) {
    setAttr(tooltip, 'data-inertia')
  }

  setContent(content, props)

  tooltip.appendChild(content)
  popper.appendChild(tooltip)

  return popper
}

/**
 * Hides all visible poppers on the document
 */
export const hideAllPoppers = excludeTippy => {
  toArray(document.querySelectorAll(Selectors.POPPER)).forEach(popper => {
    const tippy = popper._tippy
    if (!tippy) {
      return
    }

    const { props } = tippy

    if (
      (props.hideOnClick === true || props.trigger.indexOf('focus') > -1) &&
      (!excludeTippy || popper !== excludeTippy.popper)
    ) {
      tippy.hide()
    }
  })
}

/**
 * Returns an object of optional props from data-tippy-* attributes
 */
export const getDataAttributeOptions = reference =>
  Object.keys(Defaults).reduce((acc, key) => {
    const valueAsString = (
      reference.getAttribute(`data-tippy-${key}`) || ''
    ).trim()

    if (!valueAsString) {
      return acc
    }

    if (valueAsString === 'true') {
      acc[key] = true
    } else if (valueAsString === 'false') {
      acc[key] = false
    } else if (isNumeric(valueAsString)) {
      acc[key] = Number(valueAsString)
    } else if (key !== 'target' && valueAsString[0] === '[') {
      acc[key] = JSON.parse(valueAsString)
    } else {
      acc[key] = valueAsString
    }

    return acc
  }, {})

/**
 * Polyfills the virtual reference (plain object) with needed props
 */
export const polyfillVirtualReferenceProps = virtualReference => ({
  ...virtualReference,
  isVirtual: true,
  attributes: virtualReference.attributes || {},
  setAttribute(key, value) {
    this.attributes[key] = value
  },
  getAttribute(key) {
    return this.attributes[key]
  },
  removeAttribute(key) {
    delete this.attributes[key]
  },
  hasAttribute(key) {
    return key in this.attributes
  },
  addEventListener() {},
  removeEventListener() {},
  classList: {
    classNames: {},
    add(key) {
      this.classNames[key] = true
    },
    remove(key) {
      delete this.classNames[key]
    },
    contains(key) {
      return key in this.classNames
    }
  }
})

/**
 * Ponyfill for Element.prototype.matches
 */
export const matches = (() => {
  if (isBrowser) {
    const e = Element.prototype
    return (
      e.matches ||
      e.matchesSelector ||
      e.webkitMatchesSelector ||
      e.mozMatchesSelector ||
      e.msMatchesSelector
    )
  }
})()

/**
 * Ponyfill for Element.prototype.closest
 */
export const closest = (element, parentSelector) =>
  (
    Element.prototype.closest ||
    function(selector) {
      let el = this
      while (el) {
        if (matches.call(el, selector)) return el
        el = el.parentElement
      }
    }
  ).call(element, parentSelector)

/**
 * Works like Element.prototype.closest, but uses a callback instead
 */
export const closestCallback = (element, callback) => {
  while (element) {
    if (callback(element)) return element
    element = element.parentElement
  }
}

/**
 * Focuses an element while preventing a scroll jump if it's not within the viewport
 */
export const focus = el => {
  const x = window.scrollX || window.pageXOffset
  const y = window.scrollY || window.pageYOffset
  el.focus()
  scroll(x, y)
}

/**
 * Triggers reflow
 */
export const reflow = popper => {
  void popper.offsetHeight
}

/**
 * Transforms the x/y axis ased on the placement
 */
export const transformAxisBasedOnPlacement = (axis, isVertical) => {
  if (!axis) {
    return ''
  }
  return isVertical
    ? axis
    : {
        X: 'Y',
        Y: 'X'
      }[axis]
}

/**
 * Transforms the scale/translate numbers based on the placement
 */
export const transformNumbersBasedOnPlacement = (
  type,
  numbers,
  isVertical,
  isReverse
) => {
  /**
   * Avoid destructuring because a large boilerplate function is generated
   * by Babel
   */
  const a = numbers[0]
  const b = numbers[1]

  if (!a && !b) {
    return ''
  }

  const transforms = {
    scale: (() => {
      if (!b) {
        return `${a}`
      } else {
        return isVertical ? `${a}, ${b}` : `${b}, ${a}`
      }
    })(),
    translate: (() => {
      if (!b) {
        return isReverse ? `${-a}px` : `${a}px`
      } else {
        if (isVertical) {
          return isReverse ? `${a}px, ${-b}px` : `${a}px, ${b}px`
        } else {
          return isReverse ? `${-b}px, ${a}px` : `${b}px, ${a}px`
        }
      }
    })()
  }

  return transforms[type]
}

/**
 * Returns the axis for a CSS function (translate or scale)
 */
export const getTransformAxis = (str, cssFunction) => {
  const match = str.match(new RegExp(cssFunction + '([XY])'))
  return match ? match[1] : ''
}

/**
 * Returns the numbers given to the CSS function
 */
export const getTransformNumbers = (str, regex) => {
  const match = str.match(regex)
  return match ? match[1].split(',').map(parseFloat) : []
}

export const TRANSFORM_NUMBER_RE = {
  translate: /translateX?Y?\(([^)]+)\)/,
  scale: /scaleX?Y?\(([^)]+)\)/
}

/**
 * Computes the arrow's transform so that it is correct for any placement
 */
export const computeArrowTransform = (arrow, arrowTransform) => {
  const placement = getPopperPlacement(closest(arrow, Selectors.POPPER))
  const isVertical = placement === 'top' || placement === 'bottom'
  const isReverse = placement === 'right' || placement === 'bottom'

  const matches = {
    translate: {
      axis: getTransformAxis(arrowTransform, 'translate'),
      numbers: getTransformNumbers(
        arrowTransform,
        TRANSFORM_NUMBER_RE.translate
      )
    },
    scale: {
      axis: getTransformAxis(arrowTransform, 'scale'),
      numbers: getTransformNumbers(arrowTransform, TRANSFORM_NUMBER_RE.scale)
    }
  }

  const computedTransform = arrowTransform
    .replace(
      TRANSFORM_NUMBER_RE.translate,
      `translate${transformAxisBasedOnPlacement(
        matches.translate.axis,
        isVertical
      )}(${transformNumbersBasedOnPlacement(
        'translate',
        matches.translate.numbers,
        isVertical,
        isReverse
      )})`
    )
    .replace(
      TRANSFORM_NUMBER_RE.scale,
      `scale${transformAxisBasedOnPlacement(
        matches.scale.axis,
        isVertical
      )}(${transformNumbersBasedOnPlacement(
        'scale',
        matches.scale.numbers,
        isVertical,
        isReverse
      )})`
    )

  arrow.style[prefix('transform')] = computedTransform
}

/**
 * Sets the visibility state of a popper so it can begin to transition in or out
 */
export const setVisibilityState = (els, type) => {
  els.filter(Boolean).forEach(el => {
    el.setAttribute('data-state', type)
  })
}

/**
 * Prefixes a CSS property with the one supported by the browser
 */
export const prefix = property => {
  const prefixes = ['', 'webkit']
  const upperProp = property[0].toUpperCase() + property.slice(1)

  for (let i = 0; i < prefixes.length; i++) {
    const prefix = prefixes[i]
    const prefixedProp = prefix ? prefix + upperProp : property
    if (typeof document.body.style[prefixedProp] !== 'undefined') {
      return prefixedProp
    }
  }

  return null
}

/**
 * Update's a popper's position and runs a callback onUpdate; wrapper for async updates
 */
export const updatePopperPosition = (
  popperInstance,
  callback,
  updateAlreadyCalled
) => {
  const { popper, options } = popperInstance
  const onCreate = options.onCreate
  const onUpdate = options.onUpdate

  options.onCreate = options.onUpdate = () => {
    reflow(popper)
    callback && callback()
    onUpdate()
    options.onCreate = onCreate
    options.onUpdate = onUpdate
  }

  if (!updateAlreadyCalled) {
    popperInstance.scheduleUpdate()
  }
}

/**
 * Defers a function's execution until the call stack has cleared
 */
export const defer = fn => {
  setTimeout(fn, 1)
}

/**
 * Determines if the mouse cursor is outside of the popper's interactive border
 * region
 */
export const isCursorOutsideInteractiveBorder = (
  popperPlacement,
  popperRect,
  event,
  props
) => {
  if (!popperPlacement) {
    return true
  }

  const { clientX: x, clientY: y } = event
  const { interactiveBorder, distance } = props

  const exceedsTop =
    popperRect.top - y >
    (popperPlacement === 'top'
      ? interactiveBorder + distance
      : interactiveBorder)

  const exceedsBottom =
    y - popperRect.bottom >
    (popperPlacement === 'bottom'
      ? interactiveBorder + distance
      : interactiveBorder)

  const exceedsLeft =
    popperRect.left - x >
    (popperPlacement === 'left'
      ? interactiveBorder + distance
      : interactiveBorder)

  const exceedsRight =
    x - popperRect.right >
    (popperPlacement === 'right'
      ? interactiveBorder + distance
      : interactiveBorder)

  return exceedsTop || exceedsBottom || exceedsLeft || exceedsRight
}

/**
 * Returns the distance offset, taking into account the default offset due to
 * the transform: translate() rule in CSS
 */
export const getOffsetDistanceInPx = (distance, defaultDistance) =>
  -(distance - defaultDistance) + 'px'

/**
 * Returns the popper's placement, ignoring shifting (top-start, etc)
 */
export const getPopperPlacement = popper => {
  const fullPlacement = popper.getAttribute('x-placement')
  return fullPlacement ? fullPlacement.split('-')[0] : ''
}

/**
 * Evaluates props
 */
export const evaluateProps = (reference, props) => {
  const out = {
    ...props,
    ...(props.performance ? {} : getDataAttributeOptions(reference))
  }

  if (out.arrow) {
    out.animateFill = false
  }

  if (typeof out.appendTo === 'function') {
    out.appendTo = props.appendTo(reference)
  }

  if (typeof out.content === 'function') {
    out.content = props.content(reference)
  }

  return out
}