// Copied into skill folder for discoverability
// Node 16+
const fs = require('fs')
const path = require('path')

const repoRoot = process.cwd()
const menuPath = path.join(repoRoot, 'menu.json')
const viewsRoot = path.join(repoRoot, 'packages/web/src/views')

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function collectOneQESComponents(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out
  if (node.oneQESComponent && typeof node.oneQESComponent === 'string')
    out.add(node.oneQESComponent)
  for (const k of Object.keys(node)) {
    const v = node[k]
    if (Array.isArray(v)) v.forEach((i) => collectOneQESComponents(i, out))
    else if (typeof v === 'object') collectOneQESComponents(v, out)
  }
  return out
}

// build menu map: component -> [{ menuName, menuFullPath }]
const menuMap = {}

function getOneQESComponentFromNode(node) {
  if (!node || typeof node !== 'object') return null
  if (node.oneQESComponent && typeof node.oneQESComponent === 'string')
    return node.oneQESComponent
  if (node.extendAttribute && node.extendAttribute.oneQESComponent)
    return node.extendAttribute.oneQESComponent
  if (node.menuProperties && typeof node.menuProperties === 'string') {
    try {
      const parsed = JSON.parse(node.menuProperties)
      if (parsed && parsed.oneQESComponent) return parsed.oneQESComponent
    } catch (e) {
      /* ignore */
    }
  }
  return null
}

function joinMenuPath(parts) {
  const segs = parts
    .map((p) => String(p || '').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
  if (segs.length === 0) return ''
  return `/${segs.join('/')}`
}

function traverseMenu(node, parentNames = [], parentPaths = []) {
  if (!node) return
  if (Array.isArray(node))
    return node.forEach((n) => traverseMenu(n, parentNames, parentPaths))
  const name = node.menuName || node.menuCode || ''
  const pathSeg = node.menuPath || ''
  const currentNames = parentNames.concat(name).filter(Boolean)
  const currentPaths = parentPaths.concat(pathSeg).filter(Boolean)
  const fullName = currentNames.join(' / ')
  const fullPath = joinMenuPath(currentPaths)
  const comp = getOneQESComponentFromNode(node)
  if (comp) {
    if (!menuMap[comp]) menuMap[comp] = []
    menuMap[comp].push({ menuName: fullName, menuFullPath: fullPath })
  }
  if (Array.isArray(node.children) && node.children.length) {
    node.children.forEach((child) =>
      traverseMenu(child, currentNames, currentPaths)
    )
  }
}

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const ent of entries) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walkDir(full, fileList)
    else if (ent.isFile() && full.endsWith('.vue')) fileList.push(full)
  }
  return fileList
}

function matchesComponent(filePath, componentName) {
  const rel = path
    .relative(viewsRoot, filePath)
    .replace(/\\/g, '/')
    .toLowerCase()
  const name = componentName.toLowerCase()
  if (rel.includes(`/${name}/`)) return true
  if (rel.endsWith(`/${name}.vue`)) return true
  if (path.basename(rel).includes(name)) return true
  return false
}

function findComponentFiles(name) {
  const allFiles = walkDir(viewsRoot)
  const normalized = String(name || '').trim()
  if (normalized.startsWith('/')) {
    const rel = normalized.replace(/^\//, '')
    const candidate = path.join(viewsRoot, rel)
    if (fs.existsSync(candidate) && candidate.endsWith('.vue'))
      return [candidate]
  }
  if (normalized.endsWith('.vue')) {
    const candidate = path.join(viewsRoot, normalized)
    if (fs.existsSync(candidate)) return [candidate]
  }
  const base = path.basename(normalized).toLowerCase()
  const results = new Set()
  allFiles.forEach((f) => {
    const rel = path.relative(viewsRoot, f).replace(/\\/g, '/').toLowerCase()
    if (matchesComponent(f, normalized)) results.add(f)
    if (rel.endsWith(`/${base}`) || path.basename(rel) === base) results.add(f)
    if (path.basename(f).toLowerCase().includes(base)) results.add(f)
  })
  return Array.from(results)
}

function extractAxiosUrls(fileContent) {
  const urls = new Set()
  const reCall = /axios\.(get|post|put|delete|request)\s*\(\s*(['"])(.*?)\2/gi
  let m
  while ((m = reCall.exec(fileContent)) !== null) urls.add(m[3])
  const reHttpWrap =
    /(http|noInterceptors)\.(get|post|put|delete|request)\s*\(\s*(['"])(.*?)\3/gi
  while ((m = reHttpWrap.exec(fileContent)) !== null) urls.add(m[4])
  const reObj = /axios(?:\.request)?\s*\(\s*\{[\s\S]*?url\s*:\s*(['"])(.*?)\1/gi
  while ((m = reObj.exec(fileContent)) !== null) urls.add(m[2])
  const reHttpObj =
    /(http|noInterceptors)(?:\.request)?\s*\(\s*\{[\s\S]*?url\s*:\s*(['"])(.*?)\2/gi
  while ((m = reHttpObj.exec(fileContent)) !== null) urls.add(m[3])
  const reTpl = /axios\.(get|post|put|delete|request)\s*\(\s*`([^`]+)`/gi
  while ((m = reTpl.exec(fileContent)) !== null) urls.add('[DYNAMIC_TEMPLATE]')
  const reConcat =
    /axios\.(get|post|put|delete|request)\s*\(\s*(?:[^\s"'`][^"'`\n]*)?\+[^\n]*\)/gi
  if (reConcat.test(fileContent)) urls.add('[DYNAMIC_CONCAT]')
  return Array.from(urls)
}

function extractRequestParams(fileContent) {
  const requests = []
  const reCallAll =
    /(axios|http|noInterceptors)\.(get|post|put|delete|request)\s*\(\s*(['"])(.*?)\3\s*(?:,\s*([\s\S]*?))?\)/gi
  let mm
  while ((mm = reCallAll.exec(fileContent)) !== null) {
    const method = mm[2]
    const url = mm[4]
    const arg2 = mm[5] ? mm[5].trim() : null
    const entry = { url, method, params: [] }
    if (arg2) {
      if (arg2.startsWith('{')) {
        const keys = []
        const reKey = /(\w+)\s*:/g
        let k
        while ((k = reKey.exec(arg2)) !== null) keys.push(k[1])
        const reSh = /\{\s*([\w,\s]+)\s*\}/
        const sh = reSh.exec(arg2)
        if (sh && sh[1]) {
          sh[1]
            .split(',')
            .map((s) => s.trim())
            .forEach((s) => {
              if (s) keys.push(s)
            })
        }
        entry.params = Array.from(new Set(keys))
      } else {
        const varMatch = /^([\w$]+)/.exec(arg2)
        entry.paramVar = varMatch ? varMatch[1] : arg2
      }
    }
    requests.push(entry)
  }
  return requests
}

function extractResponseFieldsFromComponent(content) {
  const fields = new Set()
  const rePayload = /(?:payload|data)\s*\.\s*(\w+)/g
  let p
  while ((p = rePayload.exec(content)) !== null) fields.add(p[1])
  return Array.from(fields)
}

function dedupeMenus(menus = []) {
  const seen = new Set()
  return menus.filter((menu) => {
    const key = `${menu.menuName || ''}||${menu.menuFullPath || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function addEntry(reportItem, entry) {
  if (!reportItem || !Array.isArray(reportItem.entries)) return
  reportItem.entries.push({
    file: entry.file,
    url: entry.url,
    source: entry.source,
    responseFields: Array.isArray(entry.responseFields)
      ? entry.responseFields
      : [],
    requestParams: Array.isArray(entry.requestParams) ? entry.requestParams : []
  })
}

function main() {
  if (!fs.existsSync(menuPath)) {
    console.error('menu.json not found at', menuPath)
    process.exit(2)
  }
  const menu = readJSON(menuPath)
  traverseMenu(menu)
  const comps = Object.keys(menuMap)
  const allVueFiles = walkDir(viewsRoot)
  const report = {}

  if (comps.length === 0) console.warn('No oneQESComponent found in menu.json')

  comps.forEach((c) => {
    const files = findComponentFiles(c)
    const menus = dedupeMenus(menuMap[c] || [])
    report[c] = {
      files: files.length ? files : ['<NOT_FOUND>'],
      menuNames: menus.map((menu) => menu.menuName),
      menuPaths: menus.map((menu) => menu.menuFullPath),
      entries: [],
      axios: {}
    }
    files.forEach((f) => {
      const content = fs.readFileSync(f, 'utf8')
      const urls = extractAxiosUrls(content)

      const importRe = /import\s[\s\S]+?\sfrom\s+['"]([^'"]+)['"]/gi
      const imports = []
      let im
      while ((im = importRe.exec(content)) !== null) {
        imports.push(im[1])
      }

      const related = {}
      const visited = new Set()
      const maxDepth = 10

      function resolveImportPath(orig) {
        if (!orig) return null
        if (orig.startsWith('@/'))
          return path.join(repoRoot, 'packages/web/src', orig.slice(2))
        if (orig.startsWith('.')) return path.join(path.dirname(f), orig)
        if (orig.includes('/src/api'))
          return path.join(repoRoot, orig.replace(/^\//, ''))
        return null
      }

      function tryResolveFile(base) {
        const candidates = [
          base,
          `${base}.ts`,
          `${base}.js`,
          path.join(base, 'index.ts'),
          path.join(base, 'index.js')
        ]
        for (const c of candidates) {
          if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
        }
        return null
      }

      function scanApiFile(apiPath, depth) {
        if (!apiPath || depth > maxDepth) return
        const real = tryResolveFile(apiPath)
        if (!real) return
        if (visited.has(real)) return
        visited.add(real)
        try {
          const ac = fs.readFileSync(real, 'utf8')
          const aurls = extractAxiosUrls(ac)
          const arequests = extractRequestParams(ac)
          related[real] = {
            urls: aurls.length ? aurls : ['<NO_AXIOS_FOUND>'],
            requests: arequests
          }
          const impRe = /import\s[\s\S]+?from\s+['"]([^'"]+)['"]/gi
          let im2
          while ((im2 = impRe.exec(ac)) !== null) {
            const resolved = resolveImportPath(im2[1])
            if (resolved) scanApiFile(resolved, depth + 1)
          }
        } catch (e) {
          related[real] = ['<READ_ERROR>']
        }
      }

      imports.forEach((p) => {
        if (
          p.startsWith('@/api') ||
          p.includes('/src/api') ||
          p.startsWith('../api') ||
          p.startsWith('./api') ||
          p.startsWith('../../api')
        ) {
          const resolved = resolveImportPath(p)
          if (resolved) scanApiFile(resolved, 1)
        }
      })

      const responseFields = extractResponseFieldsFromComponent(content)
      report[c].axios[f] = {
        urls: urls.length ? urls : ['<NO_AXIOS_FOUND>'],
        responseFields
      }
      ;(urls.length ? urls : ['<NO_AXIOS_FOUND>']).forEach((url) => {
        addEntry(report[c], {
          file: f,
          url,
          source: 'component',
          responseFields,
          requestParams: []
        })
      })
      if (Object.keys(related).length) {
        report[c].axios.__related_api__ = Object.assign(
          {},
          report[c].axios.__related_api__ || {},
          related
        )
        Object.entries(related).forEach(([apiFile, apiItem]) => {
          const apiUrls =
            apiItem && Array.isArray(apiItem.urls) && apiItem.urls.length
              ? apiItem.urls
              : ['<NO_AXIOS_FOUND>']
          apiUrls.forEach((url) => {
            addEntry(report[c], {
              file: apiFile,
              url,
              source: 'api',
              responseFields: apiItem.responseFields || [],
              requestParams:
                apiItem && Array.isArray(apiItem.requests) ? apiItem.requests : []
            })
          })
        })
      }
    })
  })

  const outPath = path.join(repoRoot, 'reports', 'menu-oneQES-axios.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), report, menuMap },
      null,
      2
    )
  )

  const totalComponents = Object.keys(report).length
  let notFound = 0
  let filesWithAxios = 0
  let totalAxiosUrls = 0
  function countUrls(obj) {
    if (!obj) return
    if (Array.isArray(obj)) {
      if (!(obj.length === 1 && obj[0] === '<NO_AXIOS_FOUND>')) {
        filesWithAxios++
        totalAxiosUrls += obj.length
      }
      return
    }
    if (typeof obj === 'object') {
      Object.values(obj).forEach((v) => countUrls(v))
    }
  }
  Object.values(report).forEach((item) => {
    if (
      Array.isArray(item.files) &&
      item.files.length === 1 &&
      item.files[0] === '<NOT_FOUND>'
    )
      notFound++
    if (item.axios) countUrls(item.axios)
  })

  console.log('Report written to', outPath)
  console.log(
    `Components: ${totalComponents}, Not found: ${notFound}, Files-with-axios: ${filesWithAxios}, Axios-URLs: ${totalAxiosUrls}`
  )
}

main()
