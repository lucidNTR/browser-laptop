let vRad = 16
let tree = {
  size: 1,
  incX: 500,
  incY: 40,
  cx: 500,
  cy: 30,
  w: 80,
  h: 70,
  vis: {
    v: 0,
    l: 'tab title root',
    p: {
      x: 500,
      y: 30
    },
    c: []
  }
}

tree.getVertices = function () {
  var v = []
  function getVertices (t, f) {
    v.push({v: t.v, l: t.l, p: t.p, f: f})
    t.c.forEach(function (d) {
      return getVertices(d, {v: t.v, p: t.p})
    })
  }
  getVertices(tree.vis, {})
  return v.sort(function (a, b) { return a.v - b.v })
}

tree.getEdges = function () {
  var e = []
  function getEdges (vis) {
    vis.c.forEach(function (d) { e.push({v1: vis.v, l1: vis.l, p1: vis.p, v2: d.v, l2: d.l, p2: d.p}) })
    vis.c.forEach(getEdges)
  }
  getEdges(tree.vis)
  return e.sort(function (a, b) { return a.v2 - b.v2 })
}

tree.addLeaf = function (vis) {
  function addLeaf (t) {
    let leaf = {
      v: tree.size++,
      l: 'tab title child',
      p: {},
      c: []
    }
    if (t.v == vis) {
      t.c.push(leaf)
      return
    }
    t.c.forEach(addLeaf)
  }
  addLeaf(tree.vis)
  reposition(tree.vis)

  redraw()
}

redraw = function () {
  var edges = d3.select('#g_lines').selectAll('line').data(tree.getEdges())

  edges.transition().duration(500)
    .attr('x1', function (d) {
      return d.p1.x
    }).attr('y1', function (d) {
    return d.p1.y
  })
    .attr('x2', function (d) {
      return d.p2.x
    }).attr('y2', function (d) {
    return d.p2.y
  })

  edges.enter().append('line')
    .attr('x1', function (d) {
      return d.p1.x
    }).attr('y1', function (d) {
    return d.p1.y
  })
    .attr('x2', function (d) {
      return d.p1.x
    }).attr('y2', function (d) {
    return d.p1.y
  })
    .transition().duration(500)
    .attr('x2', function (d) {
      return d.p2.x
    }).attr('y2', function (d) {
    return d.p2.y
  })

  var circles = d3.select('#g_circles').selectAll('circle').data(tree.getVertices())

  circles.transition().duration(500).attr('cx', function (d) {
    return d.p.x
  }).attr('cy', function (d) {
    return d.p.y
  })

  circles.enter().append('circle').attr('cx', function (d) {
    return d.f.p.x
  }).attr('cy', function (d) {
    return d.f.p.y
  }).attr('r', vRad)
    .on('click', function (d) {
      return tree.addLeaf(d.v)
    })
    .transition().duration(500).attr('cx', function (d) {
    return d.p.x
  }).attr('cy', function (d) {
    return d.p.y
  })

  var labels = d3.select('#g_labels').selectAll('text').data(tree.getVertices())

  labels.text(function (d) {
    return d.l
  }).transition().duration(500)
    .attr('x', function (d) {
      return d.p.x
    }).attr('y', function (d) {
    return d.p.y + 5
  })

  labels.enter().append('text').attr('x', function (d) { return d.f.p.x;}).attr('y', function (d) {
    return d.f.p.y + 5
  })
    .text(function (d) {
      return d.l
    }).on('click', function (d) {
    return tree.addLeaf(d.v)
  })
    .transition().duration(500)
    .attr('x', function (d) {
      return d.p.x
    }).attr('y', function (d) {
    return d.p.y + 5
  })
}

getLeafCount = function (_) {
  if (_.c.length == 0) return 1
  else return _.c.map(getLeafCount).reduce(function (a, b) { return a + b;})
}

reposition = function (v) {
  let left = v.p.x - tree.w * (getLeafCount(v) - 1) / 2
  v.c.forEach(function (d) {
    var w = tree.w * getLeafCount(d)
    left += w
    d.p = {x: left - (w + tree.w) / 2, y: v.p.y + tree.h}
    reposition(d)
  })
}

d3.select('body').append('svg').attr('id', 'tree')

d3.select('#tree').append('g').attr('id', 'g_lines').selectAll('line').data(tree.getEdges()).enter().append('line')
  .attr('x1', function (d) {
    return d.p1.x
  }).attr('y1', function (d) {
  return d.p1.y
})
  .attr('x2', function (d) {
    return d.p2.x
  }).attr('y2', function (d) {
  return d.p2.y
})

d3.select('#tree').append('g').attr('id', 'g_circles').selectAll('circle').data(tree.getVertices()).enter()
  .append('circle').attr('cx', function (d) {
  return d.p.x
}).attr('cy', function (d) {
  return d.p.y
}).attr('r', vRad)
  .on('click', function (d) {
    return tree.addLeaf(d.v)
  })

d3.select('#tree').append('g').attr('id', 'g_labels').selectAll('text').data(tree.getVertices()).enter().append('text')
  .attr('x', function (d) {
    return d.p.x
  }).attr('y', function (d) {
  return d.p.y + 5
}).text(function (d) {
  return d.l
})
  .on('click', function (d) {
    return tree.addLeaf(d.v)
  })
