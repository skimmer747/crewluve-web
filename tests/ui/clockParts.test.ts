import { describe, expect, it } from 'vitest'
import { clockParts } from '../../src/ui/clockParts'

/** Which times in a line are whose, for the hover tip (time labels design §3.5). */

const NY = 'America/New_York'
const CITIES = { Anchorage: 'America/Anchorage', Cologne: 'Europe/Berlin', Taipei: 'Asia/Taipei' }
const parts = (text: string) => clockParts(text, NY, CITIES)
const N = ' '

describe('clockParts', () => {
  it("finds the family's time by its L, and gives it as a 24-hour time", () => {
    expect(parts(`Halfway at about 4:35${N}PM L`)).toEqual([
      'Halfway at about ',
      { shown: `4:35${N}PM`, label: ' L', zone: NY, isYours: true, datetime: '16:35' },
    ])
  })

  it("finds a pair's first time as the city's the line has named, and the second as the family's", () => {
    expect(parts(`Lands Anchorage about 12:35${N}PM · 4:35${N}PM L`)).toEqual([
      'Lands Anchorage about ',
      { shown: `12:35${N}PM`, label: '', zone: 'America/Anchorage', isYours: false, datetime: '12:35' },
      ' · ',
      { shown: `4:35${N}PM`, label: ' L', zone: NY, isYours: true, datetime: '16:35' },
    ])
  })

  it("finds a city's time by the city's name after it", () => {
    expect(parts(`sunrise at 7:02${N}AM Cologne`)).toEqual([
      'sunrise at ',
      { shown: `7:02${N}AM`, label: ' Cologne', zone: 'Europe/Berlin', isYours: false, datetime: '07:02' },
    ])
  })

  it("finds a city's time after its name and a dot, and before \"in\" and its name", () => {
    expect(parts(`Cologne · 9:14${N}PM`)[1]).toMatchObject({ shown: `9:14${N}PM`, label: '', zone: 'Europe/Berlin' })
    expect(parts(`9:30${N}PM in Cologne`)[0]).toMatchObject({ shown: `9:30${N}PM`, label: '', zone: 'Europe/Berlin' })
  })

  it('reads 24-hour times, and midnight and noon in 12-hour time', () => {
    expect(parts('Lands 5:35 L')[1]).toMatchObject({ shown: '5:35', datetime: '05:35' })
    expect(parts(`Leaves 12:10${N}AM L`)[1]).toMatchObject({ datetime: '00:10' })
    expect(parts(`Leaves 12:10${N}PM L`)[1]).toMatchObject({ datetime: '12:10' })
  })

  it('leaves a time no one names as it is, and words with no time whole', () => {
    expect(parts(`Fri 3:14${N}PM`)).toEqual([`Fri 3:14${N}PM`])
    expect(parts('2,140 mi flown · 1,960 to go')).toEqual(['2,140 mi flown · 1,960 to go'])
  })

  it("leaves an L that starts a word, and a city it doesn't know", () => {
    expect(parts(`4:35${N}PM Lisbon`)).toEqual([`4:35${N}PM Lisbon`])
  })
})
