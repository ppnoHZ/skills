#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const repoRoot = process.cwd()
const jsonPath = path.join(repoRoot, 'reports', 'menu-oneQES-axios.json')

function readReport() {
  if (!fs.existsSync(jsonPath)) {
    console.error('Report not found:', jsonPath)
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  if (Array.isArray(raw)) return raw
  if (raw && raw.report && typeof raw.report === 'object') {
    const out = []
    for (const [comp, compObj] of Object.entries(raw.report)) {
      const menuNames = Array.isArray(compObj.menuNames) ? compObj.menuNames : []
      const menuPaths = Array.isArray(compObj.menuPaths) ? compObj.menuPaths : []
      try {
        if (Array.isArray(compObj.entries) && compObj.entries.length) {
          for (const entry of compObj.entries) {
            out.push({
              component: comp,
              file: entry.file,
              url: entry.url,
              source: entry.source || 'component',
              requestParams: entry.requestParams || [],
              responseFields: entry.responseFields || [],
              menuNames,
              menuPaths
            })
          }
          continue
        }
        if (compObj.axios && typeof compObj.axios === 'object') {
          for (const [fileKey, val] of Object.entries(compObj.axios)) {
            if (fileKey === '__related_api__') {
              for (const [apiFile, apiVal] of Object.entries(val)) {
                if (apiVal.requests && Array.isArray(apiVal.requests)) {
                  for (const req of apiVal.requests) {
                    out.push({
                      component: comp,
                      file: apiFile,
                      url: req.url || (req && req.url) || null,
                      source: 'api',
                      requestParams: req.params || [],
                      responseFields: apiVal.responseFields || [],
                      menuNames,
                      menuPaths
                    })
                  }
                } else if (apiVal.urls && Array.isArray(apiVal.urls)) {
                  for (const u of apiVal.urls) {
                    out.push({ component: comp, file: apiFile, url: u, source: 'api', requestParams: [], responseFields: apiVal.responseFields||[], menuNames, menuPaths })
                  }
                }
              }
            } else {
              if (val && Array.isArray(val.urls)) {
                for (const u of val.urls) {
                  out.push({ component: comp, file: fileKey, url: u, source: 'component', requestParams: [], responseFields: val.responseFields || [], menuNames, menuPaths })
                }
              }
            }
          }
        }
      } catch (e) {}
      if (compObj.files && Array.isArray(compObj.files)) {
        for (const f of compObj.files) {
          out.push({ component: comp, file: f, url: '<NO_AXIOS_FOUND>', source: 'component', requestParams: [], responseFields: [], menuNames, menuPaths })
        }
      }
    }
    return out
  }
  return raw
}

function normalize(s) { return (s||'').toString().toLowerCase().replace(/\s+/g, ' ').trim() }

function scoreEntry(entry, q) {
  q = normalize(q)
  if (!q) return 0
  let score = 0
  const fields = []
  if (entry.component) fields.push(entry.component)
  if (entry.menuNames && entry.menuNames.length) fields.push(entry.menuNames.join(' ; '))
  if (entry.menuPaths && entry.menuPaths.length) fields.push(entry.menuPaths.join(' ; '))
  if (entry.file) fields.push(entry.file)
  if (entry.url) fields.push(entry.url)
  const text = normalize(fields.join(' || '))
  if (text.includes(q)) score += 50
  const qTokens = q.split(/\s+/).filter(Boolean)
  for (const t of qTokens) if (text.includes(t)) score += 5
  const textTokens = new Set(text.split(/\s+/))
  let overlap = 0
  for (const t of qTokens) if (textTokens.has(t)) overlap++
  score += overlap
  return score
}

function findMatches(report, query) {
  const scores = report.map(e=>({e, s: scoreEntry(e, query)})).filter(x=>x.s>0)
  scores.sort((a,b)=>b.s-a.s)
  const grouped = {}
  for (const {e,s} of scores) {
    const comp = e.component || '<unknown>'
    if (!grouped[comp]) grouped[comp] = {component: comp, menuNames: e.menuNames||[], menuPaths: e.menuPaths||[], entries: []}
    grouped[comp].entries.push({file: e.file, url: e.url, source: e.source, responseFields: e.responseFields||[], requestParams: e.requestParams||[]})
  }
  return Object.values(grouped)
}

function uniqueUrls(entries) {
  const seen = new Set(); const out = []
  for (const it of entries) {
    const key = `${it.url}||${it.file}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function main() {
  const argv = process.argv.slice(2)
  if (!argv.length) { console.log('Usage: node query-report.js "query"'); process.exit(0) }
  const query = argv.join(' ')
  const report = readReport()
  const matches = findMatches(report, query)
  if (!matches.length) { console.log('No matches found for:', query); return }
  for (const m of matches) {
    console.log('---')
    console.log('Component:', m.component)
    if (m.menuNames && m.menuNames.length) console.log('Menus:', m.menuNames.join(' ; '))
    if (m.menuPaths && m.menuPaths.length) console.log('Paths:', m.menuPaths.join(' ; '))
    const urls = uniqueUrls(m.entries)
    console.log('Found', urls.length, 'interface(s):')
    for (const u of urls) {
      const params = Array.isArray(u.requestParams) ? u.requestParams : []
      const resp = Array.isArray(u.responseFields) ? u.responseFields : []
      console.log('-', u.url || '<NO_AXIOS_FOUND>', '| file:', u.file || '', '| source:', u.source || '')
      if (params.length) console.log('   requestParams:', JSON.stringify(params))
      if (resp.length) console.log('   responseFields:', JSON.stringify(resp))
    }
  }
}

main()
