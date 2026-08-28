export const hskExamBank = {
  level: 4,
  totalAvailableNow: 3,
  strategy: {
    thematicTransfer: ['H41002', 'H41005'],
    reserveFullMock: ['H41003'],
    note: 'Do not consume every full variant inside daily lessons. Keep at least one unseen complete paper for a real checkpoint.',
  },
  currentAssignments: {
    diagnostic: ['H41005'],
    lesson1: ['H41005'],
    lesson2: ['H41005'],
    lesson3: ['H41005'],
    lesson4: ['H41002'],
    lesson5: ['H41002', 'H41005'],
    lesson6: ['H41005'],
    lesson7: ['H41002', 'H41005'],
    lesson8: ['H41002', 'H41005'],
    lesson9: ['H41002', 'H41005'],
    lesson10: ['H41002', 'H41005'],
    lesson11: ['H41002'],
    lesson12: ['H41005'],
    reserveMock: ['H41003'],
  },
  variants: [
    {
      id: 'H41002',
      status: 'thematic-source',
      parts: { listening: 45, reading: 40, writing: 15 },
    },
    {
      id: 'H41003',
      status: 'reserve-full-mock',
      parts: { listening: 45, reading: 40, writing: 15 },
    },
    {
      id: 'H41005',
      status: 'diagnostic-and-transfer',
      parts: { listening: 45, reading: 40, writing: 15 },
    },
  ],
}

export default hskExamBank
