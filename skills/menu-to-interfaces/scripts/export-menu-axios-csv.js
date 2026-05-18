const fs = require('fs')
const path = require('path')

const repoRoot = process.cwd()
const jsonPath = path.join(repoRoot, 'reports', 'menu-oneQES-axios.json')
const outPath = path.join(repoRoot, 'reports', 'menu-oneQES-axios.csv')

if (!fs.existsSync(jsonPath)) {
  console.error('JSON report not found:', jsonPath)
  process.exit(2)
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
const report = data.report || {}

function escapeCsvCell(s) {
  if (s === null || s === undefined) return ''
  s = String(s)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function formatRequestParams(value) {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : ''
  if (typeof value === 'object')
    return Object.keys(value).length ? JSON.stringify(value) : ''
  return String(value)
}

const rows = []
rows.push([
  'component',
  'file',
  'url',
  'source',
  'menuNames',
  'menuPaths',
  'responseFields',
  'requestParams'
])

Object.entries(report).forEach(([component, item]) => {
  const menus = (data.menuMap && data.menuMap[component]) || []
  const menuNames = Array.isArray(item.menuNames)
    ? item.menuNames.join(' ; ')
    : menus.map((m) => m.menuName).join(' ; ')
  const menuPaths = Array.isArray(item.menuPaths)
    ? item.menuPaths.join(' ; ')
    : menus.map((m) => m.menuFullPath).join(' ; ')

  if (Array.isArray(item.entries) && item.entries.length) {
    item.entries.forEach((entry) => {
      if (!entry || entry.file === '<NOT_FOUND>') return
      rows.push([
        component,
        entry.file || '',
        entry.url || '<NO_AXIOS_FOUND>',
        entry.source || 'component',
        menuNames,
        menuPaths,
        Array.isArray(entry.responseFields)
          ? entry.responseFields.join(';')
          : '',
        formatRequestParams(entry.requestParams)
      ])
    })
    return
  }

  const files = Array.isArray(item.files) ? item.files : []
  files.forEach((f) => {
    if (f === '<NOT_FOUND>') return
    const entry = (item.axios && item.axios[f]) || {
      urls: ['<NO_AXIOS_FOUND>'],
      responseFields: []
    }
    const urls = Array.isArray(entry)
      ? entry
      : entry.urls || ['<NO_AXIOS_FOUND>']
    const respFields = entry.responseFields || []
    ;(Array.isArray(urls) && urls.length ? urls : ['<NO_AXIOS_FOUND>']).forEach(
      (u) =>
        rows.push([
          component,
          f,
          u,
          'component',
          menuNames,
          menuPaths,
          respFields.join(';'),
          ''
        ])
    )
  })
  if (item.axios && item.axios.__related_api__) {
    Object.entries(item.axios.__related_api__).forEach(([apiFile, urls]) => {
      if (typeof urls === 'object' && urls.requests) {
        const urlList = urls.urls || []
        const reqs = urls.requests || []
        ;(urlList.length ? urlList : ['<NO_AXIOS_FOUND>']).forEach((u) =>
          rows.push([
            component,
            apiFile,
            u,
            'api',
            menuNames,
            menuPaths,
            '',
            JSON.stringify(reqs)
          ])
        )
      } else if (Array.isArray(urls) && urls.length) {
        urls.forEach((u) =>
          rows.push([
            component,
            apiFile,
            u,
            'api',
            menuNames,
            menuPaths,
            '',
            ''
          ])
        )
      } else {
        rows.push([
          component,
          apiFile,
          '<NO_AXIOS_FOUND>',
          'api',
          menuNames,
          menuPaths,
          '',
          ''
        ])
      }
    })
  }
})

const csv = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n')
fs.writeFileSync(outPath, csv)
console.log('CSV written to', outPath)
