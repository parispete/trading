# Trading Journal System – Requirements Specification

**Version:** 1.2  
**Datum:** 2025-01-11  
**Autor:** Peter / Claude  

---

## Inhaltsverzeichnis

1. [Projektübersicht](#1-projektübersicht)
2. [Modul: Depot-Verwaltung](#2-modul-depot-verwaltung)
3. [Modul: Chart-Replay](#3-modul-chart-replay)
4. [Modul: Trade-Journal](#4-modul-trade-journal)
5. [Modul: Technisches Screening](#5-modul-technisches-screening)
6. [Modul: Fundamentale Analyse](#6-modul-fundamentale-analyse)
7. [Modul: Internationalisierung (i18n)](#7-modul-internationalisierung-i18n)
8. [Datenmodell (Gesamt)](#8-datenmodell-gesamt)
9. [Nicht-funktionale Anforderungen](#9-nicht-funktionale-anforderungen)
10. [Offene Punkte / Roadmap](#10-offene-punkte--roadmap)

---

## 1. Projektübersicht

### 1.1 Zweck

Ein persönliches Trading-System zur Dokumentation, Analyse und Auswertung von Options-Trades mit Fokus auf die **Wheel-Strategie** (Naked Puts / Cash-Secured Puts und Covered Calls).

### 1.2 Scope

| In Scope | Out of Scope |
|----------|--------------|
| Naked Puts / Cash-Secured Puts | Multi-Leg-Strategien (Spreads, Iron Condors) |
| Covered Calls | Automatischer Handel |
| Aktien-Positionen (via Assignment oder Direktkauf) | Echtzeit-Marktdaten |
| Dividenden | Broker-Anbindung (außer Import) |
| Partial Fills (für Broker-Import) | |
| Historisches Chart-Replay mit Indikatoren | |
| Technisches Screening (Indikator-basiert) | |
| Fundamentale Analyse pro Aktie | |
| Multi-Depot-Verwaltung | |
| Internationalisierung (Englisch/Deutsch) | |
| Steuer-Reporting (später) | |

### 1.3 Zielplattform

- **Primär:** Web-Applikation
- **Später:** Desktop-App möglich

### 1.4 Geografischer Fokus

- Nur US-Aktien
- Primäre Währung: USD
- Zusätzliche Depot-Währungen möglich (EUR)

---

## 2. Modul: Depot-Verwaltung

### 2.1 Übersicht

Das System unterstützt die Verwaltung mehrerer Depots/Konten mit individuellen Einstellungen. Alle Trades, Positionen und Dividenden sind einem Depot zugeordnet. Auswertungen können depot-übergreifend oder pro Depot erfolgen.

### 2.2 User Stories

| ID | User Story | Priorität |
|----|------------|-----------|
| US-DP-01 | Als Trader möchte ich mehrere Depots anlegen und verwalten | Must |
| US-DP-02 | Als Trader möchte ich pro Depot individuelle Einstellungen festlegen (z.B. Commission in P&L) | Must |
| US-DP-03 | Als Trader möchte ich bei jedem Trade das Depot auswählen | Must |
| US-DP-04 | Als Trader möchte ich Auswertungen über alle Depots aggregiert sehen | Must |
| US-DP-05 | Als Trader möchte ich Auswertungen auf ein einzelnes Depot filtern | Must |
| US-DP-06 | Als Trader möchte ich pro Depot separate Steuer-Exports erstellen können | Should |
| US-DP-07 | Als Trader möchte ich beim IB-Import das Ziel-Depot auswählen | Must |

### 2.3 Funktionale Anforderungen

#### 2.3.1 Depot-Verwaltung

| ID | Anforderung |
|----|-------------|
| FR-DP-001 | System ermöglicht Anlage beliebig vieler Depots |
| FR-DP-002 | **Pflichtfelder Depot:** Name, Währung |
| FR-DP-003 | **Optionale Felder:** Broker-Name, Konto-Nummer (für Referenz), Beschreibung |
| FR-DP-004 | Depot kann als "Standard-Depot" markiert werden (Vorauswahl bei neuen Trades) |
| FR-DP-005 | Depot kann archiviert werden (keine neuen Trades, aber historische Daten bleiben) |
| FR-DP-006 | Depot-Löschung nur möglich wenn keine Trades zugeordnet |

#### 2.3.2 Depot-Einstellungen

| ID | Anforderung |
|----|-------------|
| FR-DP-010 | **P&L-Berechnung – Commission einbeziehen:** Checkbox (Default: JA) |
| FR-DP-010a | Wenn NEIN: P&L-Berechnung ignoriert Commissions, zeigt aber separat an |
| FR-DP-010b | Einstellung wirkt auf alle Auswertungen und Exports für dieses Depot |
| FR-DP-011 | **Quellensteuer-Satz für Dividenden:** Default-Wert pro Depot (überschreibbar pro Dividende) |
| FR-DP-012 | **Steuer-Reporting-Modus:** (für spätere Erweiterung vorgesehen) |
| FR-DP-012a | Platzhalter für: Steuer-Jahr, Freibetrag, Reporting-Format |
| FR-DP-013 | **Währung:** Basis-Währung des Depots (EUR, USD, etc.) |
| FR-DP-014 | Einstellungen können jederzeit geändert werden, Neuberechnung erfolgt automatisch |

#### 2.3.3 Depot-Zuordnung

| ID | Anforderung |
|----|-------------|
| FR-DP-020 | Jeder Trade (Trade_Position) muss genau einem Depot zugeordnet sein |
| FR-DP-021 | Jede Dividende muss genau einem Depot zugeordnet sein |
| FR-DP-022 | Jeder Wheel-Zyklus gehört zu genau einem Depot |
| FR-DP-023 | Bei Trade-Erfassung: Depot-Auswahl als Pflichtfeld (vorausgefüllt mit Standard-Depot) |
| FR-DP-024 | Bei IB-Import: Depot-Auswahl vor Import erforderlich |
| FR-DP-025 | Depot-Wechsel eines bestehenden Trades nur möglich, wenn keine Verknüpfungen (Rolls, Assignments) bestehen |

#### 2.3.4 Depot-Filter in Auswertungen

| ID | Anforderung |
|----|-------------|
| FR-DP-030 | Globaler Depot-Filter im Dashboard: [Alle Depots ▼] oder einzelnes Depot |
| FR-DP-031 | Filter wirkt auf alle Ansichten: Offene Positionen, Wheel-Zyklen, YTD Summary |
| FR-DP-032 | Bei "Alle Depots": Aggregierte Werte, mit Depot-Spalte in Listen |
| FR-DP-033 | Bei Einzeldepot: Nur Daten dieses Depots, Depot-Spalte ausgeblendet |
| FR-DP-034 | Filter-Auswahl wird in Session gespeichert (bleibt beim Seitenwechsel) |
| FR-DP-035 | Export-Funktionen respektieren aktuellen Filter |

### 2.4 Validierungsregeln

| ID | Regel |
|----|-------|
| VAL-DP-001 | Depot-Name muss eindeutig sein |
| VAL-DP-002 | Depot-Name darf nicht leer sein |
| VAL-DP-003 | Währung muss gültiger ISO-Code sein (USD, EUR, etc.) |
| VAL-DP-004 | Nur ein Depot kann als Standard markiert sein |
| VAL-DP-005 | Archiviertes Depot kann keine neuen Trades erhalten |
| VAL-DP-006 | Depot mit zugeordneten Trades kann nicht gelöscht werden |
| VAL-DP-007 | Quellensteuer-Satz muss zwischen 0% und 100% liegen |

### 2.5 UI-Konzept: Depot-Verwaltung

```
┌─────────────────────────────────────────────────────────────────────┐
│  DEPOT-VERWALTUNG                                   [+ Neues Depot] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ AKTIVE DEPOTS ──────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Name              Broker      Währung  Trades  Status       │  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  ★ IB Margin       Interactive USD      47      Standard     │  │
│  │    Roth IRA        Interactive USD      23                   │  │
│  │    Consorsbank     Consors     EUR      12                   │  │
│  │                                                               │  │
│  │  [Bearbeiten]  [Einstellungen]  [Archivieren]               │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ ARCHIVIERTE DEPOTS ─────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  (keine)                                                      │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.6 UI-Konzept: Depot-Einstellungen

```
┌─────────────────────────────────────────────────────────────────────┐
│  DEPOT-EINSTELLUNGEN: IB Margin                            [X]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ─── ALLGEMEIN ──────────────────────────────────────────────────   │
│                                                                     │
│  Name:            [IB Margin                  ]                     │
│  Broker:          [Interactive Brokers        ]                     │
│  Konto-Nr.:       [U1234567                   ]  (nur zur Referenz) │
│  Währung:         [USD ▼]                                           │
│                                                                     │
│  [✓] Als Standard-Depot verwenden                                   │
│                                                                     │
│  ─── P&L-BERECHNUNG ─────────────────────────────────────────────   │
│                                                                     │
│  [✓] Commissions in P&L-Berechnung einbeziehen                      │
│                                                                     │
│      ℹ Wenn deaktiviert: P&L wird ohne Abzug der Commissions       │
│        berechnet. Commissions werden separat ausgewiesen.          │
│        Relevant für Steuererklärungen, bei denen Kosten nicht      │
│        abzugsfähig sind.                                           │
│                                                                     │
│  ─── DIVIDENDEN ─────────────────────────────────────────────────   │
│                                                                     │
│  Standard-Quellensteuer:  [15    ] %                                │
│                                                                     │
│      ℹ Wird als Vorauswahl bei neuen Dividenden verwendet.         │
│        Kann pro Dividende überschrieben werden.                    │
│                                                                     │
│  ─── STEUER-REPORTING (coming soon) ─────────────────────────────   │
│                                                                     │
│  [ ] Steuer-Reporting aktivieren                                    │
│      Steuer-Jahr:         [2024 ▼]                                  │
│      Freibetrag genutzt:  [        ] €                              │
│      Reporting-Format:    [Deutschland ▼]                           │
│                                                                     │
│                                         [Abbrechen]  [Speichern]    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modul: Chart-Replay

### 3.1 Übersicht & Zweck

Das Chart-Replay-Modul ermöglicht dem Nutzer, historische Kursdaten Kerze für Kerze durchzugehen, um Trading-Setups zu analysieren, ohne durch zukünftige Daten beeinflusst zu werden. Der Fokus liegt auf der Wheel-Strategie mit wöchentlichem Handelszyklus (Montag Open → Freitag Close).

**Kritisches Requirement:** Strikte Point-in-Time-Berechnung aller Indikatoren – keine Look-Ahead-Bias.

### 3.2 User Stories

| ID | User Story | Priorität |
|----|------------|-----------|
| US-CR-01 | Als Trader möchte ich OHLCV-Daten (CSV) für eine Aktie hochladen, damit ich deren historische Charts analysieren kann | Must |
| US-CR-02 | Als Trader möchte ich mit der rechten Maustaste eine Kerze vorwärts scrollen, damit ich den Kursverlauf simulieren kann | Must |
| US-CR-03 | Als Trader möchte ich mit der linken Maustaste eine Kerze rückwärts scrollen, damit ich Situationen erneut betrachten kann | Must |
| US-CR-04 | Als Trader möchte ich zwischen Tages- und Wochenchart wechseln, damit ich verschiedene Zeitebenen analysieren kann | Must |
| US-CR-05 | Als Trader möchte ich konfigurierbare Indikatoren (RSI, Bollinger Bands, SMA, EMA, MACD) sehen, die strikt point-in-time berechnet werden | Must |
| US-CR-06 | Als Trader möchte ich Montage visuell markiert sehen, damit ich meinen Handelszyklus erkenne | Must |
| US-CR-07 | Als Trader möchte ich zu einem bestimmten Datum springen können, damit ich gezielt Situationen analysieren kann | Should |
| US-CR-08 | Als Trader möchte ich an der aktuellen Kerze eine Notiz + Screenshot hinterlegen können | Should |
| US-CR-09 | Als Trader möchte ich die Anzahl sichtbarer Kerzen (Viewport) einstellen können | Could |
| US-CR-10 | Als Trader möchte ich meine Trades als horizontale Linien auf Strike-Höhe im Chart sehen | Must |

### 3.3 Funktionale Anforderungen

#### 3.3.1 Daten-Import

| ID | Anforderung |
|----|-------------|
| FR-CR-001 | System akzeptiert CSV-Dateien mit Spalten: Date, Open, High, Low, Close, Volume |
| FR-CR-002 | System erkennt gängige Datumsformate automatisch (YYYY-MM-DD, DD.MM.YYYY, MM/DD/YYYY) |
| FR-CR-003 | System validiert Daten: High ≥ Low, High ≥ Open/Close, Low ≤ Open/Close |
| FR-CR-004 | System sortiert Daten chronologisch aufsteigend nach Import |
| FR-CR-005 | System speichert importierte Daten persistent pro Ticker |
| FR-CR-006 | System unterstützt Daten-Update (neue Kerzen anhängen, ohne bestehende zu überschreiben) |

#### 3.3.2 Chart-Darstellung

| ID | Anforderung |
|----|-------------|
| FR-CR-010 | System zeigt Candlestick-Chart (japanische Kerzen) |
| FR-CR-011 | Grüne Kerze = Close > Open, Rote Kerze = Close < Open |
| FR-CR-012 | X-Achse zeigt Datum, Y-Achse zeigt Preis (automatisch skaliert) |
| FR-CR-013 | Montage werden durch vertikale gestrichelte Linie (grün) markiert |
| FR-CR-015 | Aktuelle Kerze (Replay-Position) wird visuell hervorgehoben (z.B. Rahmen oder Hintergrund) |
| FR-CR-016 | Kerzen rechts von der aktuellen Position werden **nicht** angezeigt |

#### 3.3.3 Navigation

| ID | Anforderung |
|----|-------------|
| FR-CR-020 | Rechtsklick im Chart-Bereich → eine Kerze vorwärts |
| FR-CR-021 | Linksklick im Chart-Bereich → eine Kerze rückwärts |
| FR-CR-022 | Mausrad nach oben → Zoom in (weniger Kerzen, größere Darstellung) |
| FR-CR-023 | Mausrad nach unten → Zoom out (mehr Kerzen, kleinere Darstellung) |
| FR-CR-024 | Tastatur: Pfeil rechts → eine Kerze vorwärts |
| FR-CR-025 | Tastatur: Pfeil links → eine Kerze rückwärts |
| FR-CR-026 | Tastatur: Shift + Pfeil rechts → 5 Kerzen vorwärts |
| FR-CR-027 | Tastatur: Shift + Pfeil links → 5 Kerzen rückwärts |
| FR-CR-028 | Datums-Picker: Sprung zu beliebigem Datum im Datenbereich |
| FR-CR-029 | Am ersten Datenpunkt stoppt Rückwärts-Navigation (kein Wrap-Around) |
| FR-CR-030 | Am letzten Datenpunkt stoppt Vorwärts-Navigation |

#### 3.3.4 Timeframe-Wechsel

| ID | Anforderung |
|----|-------------|
| FR-CR-040 | Toggle zwischen Daily (D) und Weekly (W) Ansicht |
| FR-CR-041 | Bei Wechsel D→W: System aggregiert Tagesdaten zu Wochenkerzen (Mo Open, Fr Close, Wochen-High/Low, Summe Volume) |
| FR-CR-042 | Bei Wechsel W→D: System springt zur entsprechenden Woche im Tages-Chart |
| FR-CR-043 | Replay-Position bleibt beim Wechsel erhalten (gleiches Datum bzw. gleiche Woche) |

#### 3.3.5 Indikatoren – Point-in-Time-Berechnung

##### Grundprinzip

| ID | Anforderung |
|----|-------------|
| FR-CR-050 | Alle Indikator-Berechnungen verwenden **ausschließlich** Daten bis einschließlich aktueller Kerze |
| FR-CR-051 | Indikator-Linien enden **exakt** an der aktuellen Kerze (kein Überhang, keine Richtungsandeutung) |
| FR-CR-052 | Bei Navigation wird der neue Indikator-Wert sofort angezeigt (kein Übergang/Animation) |

##### Bollinger Bands

| ID | Anforderung |
|----|-------------|
| FR-CR-053 | Bollinger Bands: SMA ± X Standardabweichungen auf Close-Preisen |
| FR-CR-053a | **Parameter: Perioden** – konfigurierbar, Default: 20, Range: 5–100 |
| FR-CR-053b | **Parameter: Standardabweichungen** – konfigurierbar, Default: 2.0, Range: 0.5–4.0 |
| FR-CR-053c | Anzeige der aktuellen Werte: "BB(20,2): 168.50 / 171.20 / 173.90" |

##### RSI

| ID | Anforderung |
|----|-------------|
| FR-CR-054 | RSI nach Wilder-Methode in separatem Panel |
| FR-CR-054a | **Parameter: Perioden** – konfigurierbar, Default: 14, Range: 2–50 |
| FR-CR-054b | **Parameter: Überkauft-Linie** – konfigurierbar, Default: 70 |
| FR-CR-054c | **Parameter: Überverkauft-Linie** – konfigurierbar, Default: 30 |
| FR-CR-054d | Anzeige: "RSI(14): 42.3" |

##### SMA (Simple Moving Average)

| ID | Anforderung |
|----|-------------|
| FR-CR-055 | Mehrere SMAs gleichzeitig aktivierbar (z.B. SMA 50 + SMA 200) |
| FR-CR-055a | **Parameter: Perioden** – pro SMA konfigurierbar, Range: 5–500 |
| FR-CR-055b | **Parameter: Farbe** – pro SMA wählbar |
| FR-CR-055c | Anzeige im Chart als durchgezogene Linie |
| FR-CR-055d | Legende: "SMA(50): 172.30" |

##### EMA (Exponential Moving Average)

| ID | Anforderung |
|----|-------------|
| FR-CR-056 | Mehrere EMAs gleichzeitig aktivierbar |
| FR-CR-056a | **Parameter: Perioden** – pro EMA konfigurierbar, Range: 5–500 |
| FR-CR-056b | **Parameter: Farbe** – pro EMA wählbar |
| FR-CR-056c | EMA-Berechnung: Multiplier = 2 / (Perioden + 1) |
| FR-CR-056d | Legende: "EMA(21): 171.85" |

##### MACD

| ID | Anforderung |
|----|-------------|
| FR-CR-057 | MACD in separatem Panel |
| FR-CR-057a | **Parameter: Fast EMA** – Default: 12, Range: 2–50 |
| FR-CR-057b | **Parameter: Slow EMA** – Default: 26, Range: 2–100 |
| FR-CR-057c | **Parameter: Signal Line** – Default: 9, Range: 2–50 |
| FR-CR-057d | Darstellung: MACD-Linie, Signal-Linie, Histogramm (Balken) |
| FR-CR-057e | Histogramm: grün wenn MACD > Signal, rot wenn MACD < Signal |
| FR-CR-057f | Anzeige: "MACD(12,26,9): 1.23 / Signal: 0.98 / Hist: 0.25" |

##### Volume

| ID | Anforderung |
|----|-------------|
| FR-CR-058 | Volume-Bars in separatem Panel am unteren Chart-Rand |
| FR-CR-058a | Grüne Bars: Close > Open (Up-Day) |
| FR-CR-058b | Rote Bars: Close < Open (Down-Day) |
| FR-CR-058c | **Optional: Volume SMA** – konfigurierbar, Default: 20 |
| FR-CR-058d | Y-Achse automatisch skaliert |

#### 3.3.6 Trade-Visualisierung im Chart

##### Grundprinzip

| ID | Anforderung |
|----|-------------|
| FR-CR-070 | Offene und geschlossene Trades werden als horizontale Linien auf Strike-Preis-Höhe angezeigt |
| FR-CR-071 | Linie beginnt am Eröffnungsdatum, endet am Schließ-/Verfalldatum |
| FR-CR-072 | **Am Anfang der Linie:** Volumen mit Vorzeichen (z.B. "-2" für 2 verkaufte Puts) |
| FR-CR-073 | **Am Ende der Linie:** Vertikaler Strich "|" als Abschluss-Markierung |
| FR-CR-074 | Linie wird nur bis zur aktuellen Replay-Position angezeigt (Point-in-Time) |

##### Farbkodierung

| ID | Anforderung |
|----|-------------|
| FR-CR-075 | **Short Put (Naked Put / CSP):** Orange/Gelb |
| FR-CR-076 | **Short Call (Covered Call):** Blau |
| FR-CR-077 | **Aktienposition:** Grün (wenn assigned) |
| FR-CR-078 | Einheitliche Liniendicke für alle Trades |

##### Status-Darstellung

| ID | Anforderung |
|----|-------------|
| FR-CR-080 | **Offene Position:** Linie durchgezogen, endet an aktueller Kerze (kein "|") |
| FR-CR-081 | **Geschlossen (Buyback / Wertlos verfallen):** Linie endet mit "|" |
| FR-CR-082a | **Roll auf anderen Strike:** Linie endet mit "→", Pfeil zeigt diagonal zum neuen Strike, neue Linie beginnt |
| FR-CR-082b | **Roll auf gleichen Strike (nur neues Expiry):** Linie endet mit "↻" (kleines Pfeil-Symbol), neue Linie beginnt direkt daneben auf gleicher Höhe |
| FR-CR-082c | Beide Roll-Typen werden im Tooltip unterschieden: "Rolled out" (gleiches Strike) vs. "Rolled down/up" (anderer Strike) |
| FR-CR-083 | **Assigned:** Linie endet mit "▼" (Put) bzw. "▲" (Call), Aktienposition beginnt |

##### Interaktion

| ID | Anforderung |
|----|-------------|
| FR-CR-085 | Hover über Trade-Linie zeigt Tooltip mit Details: Strike, Premium, DTE, P/L |
| FR-CR-086 | Klick auf Trade-Linie öffnet Trade-Detail im Journal |

### 3.4 UI-Konzept: Chart-Replay

```
┌─────────────────────────────────────────────────────────────────────┐
│  [AAPL ▼]  [Daily | Weekly]  [← 2024-03-15 →]  [⚙ Indikatoren]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   $175 ─┬───────────────────────────────────────────────────────    │
│         │    ┌─┐                              ┌─┐                   │
│         │  ┌─┤ ├─┐    ╎              ╎      ┌─┤ │    ╎              │
│   $170 ─│──┤ │ │ ├────╎──────────────╎──────┤ └─┤────╎──[CURRENT]   │
│         │  └─┤ ├─┘    ╎              ╎      └───┘    ╎              │
│         │    └─┘      ╎              ╎               ╎              │
│   $165 ─│─────────────╎──────────────╎───────────────╎───────────   │
│         │             ╎              ╎               ╎              │
│ --------│-═══════════════════════════════════════════════ BB Upper  │
│ SMA(50) │ ──────────────────────────────────────────────            │
│ --------│-─────────────────────────────────────────────── BB Mid    │
│         │                                                           │
│   $160 ─│─────────────────────────────────────────────────────────  │
│         │                                                           │
│  -2 ════╪════════════════════════════════════════════●  ← Short Put │
│   $155 ─│                                            ↑              │
│         │                                     (Position offen,      │
│         │                                      Strike $155)         │
│         │                                                           │
│   $150 ─┴───────────────────────────────────────────────────────    │
│         ╎Mo           ╎Mo            ╎Mo             ╎Mo            │
├─────────────────────────────────────────────────────────────────────┤
│  Volume                                              ▐              │
│    2M ─ ▐   ▐         ▐    ▐         ▐        ▐▐     ▐              │
│    1M ─ ▐▐  ▐▐   ▐▐   ▐▐   ▐▐   ▐▐   ▐▐   ▐▐  ▐▐▐    ▐▐             │
├─────────────────────────────────────────────────────────────────────┤
│   RSI(14): 42.3                                                     │
│    70 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │
│         ╱╲    ╱╲                          ╱╲                         │
│        ╱  ╲  ╱  ╲___      ___╱╲___╱╲_____╱  ╲__●                     │
│    30 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │
├─────────────────────────────────────────────────────────────────────┤
│   MACD(12,26,9): 1.23  Signal: 0.98  Hist: 0.25                     │
│         ▁▂▃▄▅▆▅▄▃▂▁▁▂▃▄▅▆▇▆▅▄▃▂▁▁▂▃▄▅▆▅▄▃●                          │
│    0 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │
│         ▔▔▔▔▔▔▔▔▔▔▔▔▔▔                                              │
├─────────────────────────────────────────────────────────────────────┤
│  BB(20,2): 168.50 / 171.20 / 173.90   SMA(50): 172.30               │
│  [+ Notiz]  [Trade hier eintragen]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 Trade-Visualisierung Beispiele

```
Beispiel 1: Short Put verkauft, noch offen
─────────────────────────────────────────
  -2 ════════════════════════════════●   (Linie endet an aktueller Kerze)
     ↑                               ↑
  Eröffnung                     Heute (offen)
  (2 Puts @ $155)


Beispiel 2: Short Put geschlossen (Buyback oder wertlos verfallen)
─────────────────────────────────────────
  -2 ════════════════════════════════|
     ↑                               ↑
  Eröffnung                     Geschlossen


Beispiel 3: Roll auf niedrigeren Strike (Rolled Down)
─────────────────────────────────────────
  $160:  -2 ═══════════════════→
                               ╲
  $155:                          -2 ═══════════●


Beispiel 4: Roll auf gleichen Strike (Rolled Out – nur neues Expiry)
─────────────────────────────────────────
  $155:  -2 ═══════════════════↻ -2 ═══════════════●
                               │
                         (gleicher Strike,
                          neues Verfallsdatum)


Beispiel 5: Put assigned → Aktien erhalten → Covered Call
─────────────────────────────────────────
  $160:  -1 ═══════════════════▼              (Put assigned)
                               │
  Aktien:                      ├──────────────────────────  (+100 Shares)
                               │
  $165:                        └─────  -1 ════════════●     (CC @ $165)
```

### 3.6 Edge Cases & Validierung

| Szenario | Erwartetes Verhalten |
|----------|---------------------|
| Weniger als 20 Kerzen geladen | Bollinger Bands werden nicht angezeigt (Warnung: "Mindestens 20 Datenpunkte erforderlich") |
| Weniger als 14 Kerzen geladen | RSI wird nicht angezeigt |
| Replay-Position = erste Kerze | Rückwärts-Navigation deaktiviert, Indikatoren zeigen "n/a" wenn nicht genug Historie |
| Lücken in Daten (z.B. Feiertage) | Werden übersprungen, keine leeren Kerzen |
| Wochenende-Daten vorhanden | Werden beim Import gefiltert (nur Mo-Fr) |
| CSV mit falscher Spaltenreihenfolge | Mapping-Dialog oder automatische Erkennung via Header |

### 3.7 Nicht-funktionale Anforderungen (Chart-Replay)

| ID | Anforderung |
|----|-------------|
| NFR-CR-001 | Navigation (Kerze vor/zurück) reagiert in < 50ms |
| NFR-CR-002 | Daten-Import von 10 Jahren Tagesdaten (ca. 2.500 Zeilen) dauert < 3 Sekunden |
| NFR-CR-003 | Chart bleibt flüssig bei bis zu 500 sichtbaren Kerzen |
| NFR-CR-004 | System funktioniert offline (nach initialem Daten-Import) |

---

## 4. Modul: Trade-Journal

### 4.1 Übersicht & Zweck

Das Trade-Journal dokumentiert den gesamten Lebenszyklus jeder Options-Position: von der Vorbereitung über Eröffnung, mögliche Rolls bis zum Schließen. Es ist die zentrale Datenquelle für die Chart-Visualisierung und spätere Auswertungen.

**Scope:**
- ✓ Naked Puts / Cash-Secured Puts
- ✓ Covered Calls
- ✓ Aktien-Positionen (via Assignment oder Direktkauf)
- ✓ Dividenden
- ✓ Partial Fills (für Broker-Import)
- ✗ Multi-Leg-Strategien (Spreads, Iron Condors etc.)

### 4.2 Wheel-Zyklus Konzept

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│    ┌──────────────┐      Wertlos       ┌──────────────┐            │
│    │              │      verfallen     │              │            │
│    │  SHORT PUT   │─────────────────→──│  SHORT PUT   │  (Repeat)  │
│    │  (CSP)       │                    │  (neuer)     │            │
│    │              │──┐                 │              │            │
│    └──────────────┘  │                 └──────────────┘            │
│           │          │ Rolled                  ↑                    │
│           │          └─────────────────────────┘                    │
│           │ Assigned                                                │
│           ↓                                                         │
│    ┌──────────────┐                                                │
│    │              │                                                │
│    │  LONG STOCK  │←─────────────────────────────┐                 │
│    │  (+100 Sh.)  │                              │                 │
│    │      │       │──┐                           │                 │
│    │  Dividende $ │  │                           │                 │
│    └──────────────┘  │                           │                 │
│           │          │ Rolled                    │                 │
│           │          └───────────┐               │                 │
│           ↓                      ↓               │                 │
│    ┌──────────────┐      ┌──────────────┐       │                 │
│    │              │      │              │       │                 │
│    │  SHORT CALL  │─────→│  SHORT CALL  │       │                 │
│    │  (CC)        │      │  (neuer)     │       │                 │
│    │              │      │              │       │                 │
│    └──────────────┘      └──────────────┘       │                 │
│           │                     │                │                 │
│           │ Called Away         │ Wertlos        │                 │
│           ↓                     ↓                │                 │
│    ┌──────────────┐      Repeat mit             │                 │
│    │   VERKAUFT   │      gleichem Stock ────────┘                 │
│    │   (Exit)     │                                                │
│    └──────────────┘                                                │
│           │                                                         │
│           └──→ Zurück zu SHORT PUT (neuer Zyklus)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 User Stories

| ID | User Story | Priorität |
|----|------------|-----------|
| US-TJ-01 | Als Trader möchte ich einen neuen Short Put eröffnen und alle relevanten Daten erfassen | Must |
| US-TJ-02 | Als Trader möchte ich eine Position rollen (gleicher oder anderer Strike) und die Verknüpfung zum Original behalten | Must |
| US-TJ-03 | Als Trader möchte ich eine Position schließen (Buyback, Verfall, Assignment) | Must |
| US-TJ-04 | Als Trader möchte ich bei Assignment automatisch die Aktienposition anlegen lassen | Must |
| US-TJ-05 | Als Trader möchte ich Covered Calls auf meine Aktienposition verkaufen | Must |
| US-TJ-06 | Als Trader möchte ich zu jedem Trade Notizen und Screenshots hinzufügen | Must |
| US-TJ-07 | Als Trader möchte ich die Trade-Vorbereitung (Analyse) dokumentieren, bevor ich eröffne | Should |
| US-TJ-08 | Als Trader möchte ich alle Trades eines Tickers chronologisch sehen | Must |
| US-TJ-09 | Als Trader möchte ich offene Positionen auf einen Blick sehen | Must |
| US-TJ-10 | Als Trader möchte ich den realisierten und unrealisierten P/L pro Position sehen | Must |
| US-TJ-11 | Als Trader möchte ich die Prämieneinnahmen über Zeit verfolgen | Should |
| US-TJ-12 | Als Trader möchte ich Wheel-Zyklen als zusammenhängende Einheit sehen | Should |
| US-TJ-13 | Als Trader möchte ich Dividenden erfassen, die ich während des Aktienbesitzes erhalte | Must |
| US-TJ-14 | Als Trader möchte ich Trades aus Interactive Brokers importieren können | Must |
| US-TJ-15 | Als Trader möchte ich, dass Partial Fills korrekt zu einer Gesamt-Position aggregiert werden | Must |

### 4.4 Funktionale Anforderungen

#### 4.4.1 Trade-Eröffnung

| ID | Anforderung |
|----|-------------|
| FR-TJ-001 | System ermöglicht Anlage einer neuen Position vom Typ: SHORT_PUT, SHORT_CALL, LONG_STOCK |
| FR-TJ-002 | **Pflichtfelder SHORT_PUT / SHORT_CALL:** Depot, Ticker, Strike, Expiration Date, Quantity, Premium (pro Kontrakt), Commission |
| FR-TJ-003 | **Optionale Felder:** Delta, IV (Implied Volatility), IV Rank/Percentile, Underlying Price bei Eröffnung |
| FR-TJ-004 | **Pflichtfelder LONG_STOCK:** Depot, Ticker, Quantity, Kaufpreis (oder "via Assignment"), Commission |
| FR-TJ-005 | System berechnet automatisch: DTE (Days to Expiration), Total Premium, Break-Even |
| FR-TJ-005a | System berechnet Net Premium = Total Premium - Commission |
| FR-TJ-006 | System setzt Open Date auf aktuelles Datum (überschreibbar für nachträgliche Erfassung) |
| FR-TJ-007 | Bei Eröffnung kann optional eine vorherige Trade-Analyse verknüpft werden |

#### 4.4.2 Rollen (Roll)

| ID | Anforderung |
|----|-------------|
| FR-TJ-010 | Aktion "Rollen" schließt aktuelle Position und eröffnet neue in einem Vorgang |
| FR-TJ-011 | **Roll-Eingabe:** Neuer Strike, Neues Expiration Date, Credit/Debit des Rolls, Commission für Buyback, Commission für neue Position |
| FR-TJ-012 | System berechnet Net Credit/Debit aus: (neues Premium) - (Buyback-Kosten altes Premium) |
| FR-TJ-012a | System berechnet Net Credit/Debit inkl. beider Commissions |
| FR-TJ-013 | System verknüpft alte und neue Position (rolled_from_trade_id) |
| FR-TJ-014 | **Roll-Typen werden automatisch erkannt:** |
| FR-TJ-014a | Roll Out = gleicher Strike, späteres Expiry |
| FR-TJ-014b | Roll Down = niedrigerer Strike (bei Puts) |
| FR-TJ-014c | Roll Up = höherer Strike (bei Puts) |
| FR-TJ-014d | Roll Out and Down/Up = Kombination |
| FR-TJ-015 | Alte Position erhält close_type = 'ROLLED' |

#### 4.4.3 Position schließen

| ID | Anforderung |
|----|-------------|
| FR-TJ-020 | **Schließen durch Buyback:** Eingabe Buyback-Preis, Commission, System berechnet realisierten P/L |
| FR-TJ-021 | **Schließen durch Verfall (Expired Worthless):** Kein Buyback-Preis, volle Prämie = Gewinn |
| FR-TJ-022 | **Schließen durch Assignment (nur Puts):** |
| FR-TJ-022a | System erstellt automatisch LONG_STOCK Position mit Quantity = Kontraktanzahl × 100 |
| FR-TJ-022b | Kaufpreis = Strike Price |
| FR-TJ-022c | System verrechnet erhaltene Prämie in Cost Basis |
| FR-TJ-022d | Commission für Aktien-Einbuchung erfassen |
| FR-TJ-023 | **Schließen durch Called Away (nur Calls):** |
| FR-TJ-023a | System schließt LONG_STOCK Position |
| FR-TJ-023b | Verkaufspreis = Strike Price |
| FR-TJ-023c | System berechnet Gesamt-P/L inkl. Aktiengewinn und Prämien |
| FR-TJ-023d | Commission für Aktien-Ausbuchung erfassen |
| FR-TJ-024 | Close Date wird erfasst (Default: aktuelles Datum) |

#### 4.4.4 Covered Call auf Aktienposition

| ID | Anforderung |
|----|-------------|
| FR-TJ-030 | Bei vorhandener LONG_STOCK Position: Button "Covered Call verkaufen" |
| FR-TJ-031 | System prüft: Aktienanzahl ≥ Kontraktanzahl × 100 |
| FR-TJ-032 | Covered Call wird automatisch mit LONG_STOCK verknüpft (covered_by_stock_id) |
| FR-TJ-033 | Wenn CC assigned wird → Aktienposition wird anteilig geschlossen |

#### 4.4.5 Dividenden

| ID | Anforderung |
|----|-------------|
| FR-TJ-035 | System ermöglicht Erfassung von Dividenden für LONG_STOCK Positionen |
| FR-TJ-036 | **Pflichtfelder Dividende:** Depot, Ex-Dividend Date, Payment Date, Dividend per Share, Shares (vorausgefüllt aus Position) |
| FR-TJ-037 | **Optionale Felder:** Quellensteuer (Withholding Tax), Netto-Betrag |
| FR-TJ-038 | System berechnet: Brutto-Dividende = Dividend per Share × Shares |
| FR-TJ-039 | System berechnet: Netto-Dividende = Brutto - Quellensteuer |
| FR-TJ-039a | Dividenden werden dem Wheel-Zyklus zugeordnet |
| FR-TJ-039b | Dividenden fließen in Gesamt-P/L des Zyklus ein |
| FR-TJ-039c | Dividenden werden in der Aktienposition-Detailansicht chronologisch aufgelistet |

#### 4.4.6 Trade-Vorbereitung / Analyse-Notizen

| ID | Anforderung |
|----|-------------|
| FR-TJ-040 | System ermöglicht Anlage von "Trade-Ideen" ohne sofortige Eröffnung |
| FR-TJ-041 | **Felder Trade-Idee:** Ticker, Datum, Freitext-Notiz, Screenshots (mehrere möglich) |
| FR-TJ-042 | Trade-Idee kann später mit tatsächlichem Trade verknüpft werden |
| FR-TJ-043 | Trade-Ideen ohne Verknüpfung bleiben als "nicht umgesetzt" sichtbar |
| FR-TJ-044 | Wöchentliche Analyse-Session: Sammel-Notiz für mehrere Ticker möglich |

#### 4.4.7 Notizen & Screenshots

| ID | Anforderung |
|----|-------------|
| FR-TJ-050 | Jede Position kann beliebig viele Notizen haben |
| FR-TJ-051 | Jede Notiz kann beliebig viele Screenshots/Bilder enthalten |
| FR-TJ-052 | Notizen sind mit Timestamp versehen |
| FR-TJ-053 | Notiz-Typen: SETUP (vor Trade), MANAGEMENT (während), REVIEW (nach Schließen) |
| FR-TJ-054 | Bilder werden lokal gespeichert, Thumbnails in der Übersicht angezeigt |
| FR-TJ-055 | Bildformate: PNG, JPG, GIF (max. 10 MB pro Bild) |

#### 4.4.8 Wheel-Zyklus-Tracking

| ID | Anforderung |
|----|-------------|
| FR-TJ-060 | System erkennt zusammenhängende Wheel-Zyklen automatisch |
| FR-TJ-061 | **Zyklus beginnt:** Erster Short Put auf einen Ticker (ohne Vorgänger) |
| FR-TJ-062 | **Zyklus enthält:** Alle Rolls, Assignment, Covered Calls auf die assignten Shares, Dividenden |
| FR-TJ-063 | **Zyklus endet:** Called Away oder Verkauf der Aktien oder Buyback ohne Assignment |
| FR-TJ-064 | Pro Zyklus: Aggregierte Ansicht aller Prämien, Dividenden, Gesamt-P/L, Dauer |
| FR-TJ-065 | Zyklus erhält automatische ID: {Ticker}-{Jahr}-{Nummer} (z.B. "AAPL-2024-03") |

#### 4.4.9 Broker-Import (Interactive Brokers)

| ID | Anforderung |
|----|-------------|
| FR-TJ-080 | System akzeptiert CSV/Excel-Export aus Interactive Brokers (Activity Statement) |
| FR-TJ-081 | System erkennt automatisch Transaktionstypen: Trade, Assignment, Exercise, Expiration, Dividend |
| FR-TJ-082 | System mappt IB-Felder auf interne Datenstruktur |
| FR-TJ-083 | **Partial Fill Handling:** |
| FR-TJ-083a | System erkennt Partial Fills anhand gleicher Order-ID oder Symbol/Strike/Expiry am gleichen Tag |
| FR-TJ-083b | System aggregiert Partial Fills zu einer Gesamt-Position |
| FR-TJ-083c | Durchschnittspreis wird berechnet: Σ(Quantity × Price) / Σ(Quantity) |
| FR-TJ-083d | Commissions werden summiert über alle Fills |
| FR-TJ-084 | **Import-Vorschau:** Benutzer sieht erkannte Transaktionen vor dem Import |
| FR-TJ-084a | Bei Import-Vorschau: Depot-Auswahl erforderlich bevor Import möglich |
| FR-TJ-085 | **Duplikat-Erkennung:** System warnt bei bereits importierten Transaktionen (anhand Trade-ID/Datum/Details) |
| FR-TJ-086 | **Zuordnung zu bestehenden Positionen:** System schlägt Matches vor (z.B. Buyback zu offenem Put) |
| FR-TJ-087 | System importiert Dividenden aus IB-Export automatisch |

#### 4.4.10 Auswertungen

| ID | Anforderung |
|----|-------------|
| FR-TJ-070 | Dashboard zeigt "Total Commissions YTD" |
| FR-TJ-071 | Pro Wheel-Zyklus: Separate Anzeige der Commissions |
| FR-TJ-072 | Auswertung: Commission als % vom Gewinn (Kostenquote) |
| FR-TJ-073 | Dashboard zeigt "Total Dividends YTD" |
| FR-TJ-074 | Auswertung: Dividenden-Anteil am Gesamtertrag |

### 4.5 Berechnungslogik

#### 4.5.1 P/L-Berechnung Short Put

```
Premium erhalten:        quantity × premium_per_contract × 100
Commission (Open):       commission_open

Net Premium:             Premium erhalten - Commission (Open)

Bei Verfall (wertlos):   Realized P/L = Net Premium

Bei Buyback:             Buyback-Kosten = Buyback-Preis × quantity × 100
                         Realized P/L = Net Premium - Buyback-Kosten - Commission (Close)

Bei Assignment:          Realized P/L der Option = Net Premium
                         Stock Cost Basis = Strike - (Net Premium / Shares) + (Commission Assignment / Shares)
```

#### 4.5.2 P/L-Berechnung Covered Call

```
Net Premium:             (quantity × premium × 100) - Commission (Open)

Bei Verfall (wertlos):   Realized P/L = Net Premium

Bei Called Away:         Realized P/L Option = Net Premium
                         Realized P/L Stock = (Strike × Shares) - (Cost Basis × Shares) - Commission (Called Away)
                         Total = Option P/L + Stock P/L
```

#### 4.5.3 Wheel-Zyklus Gesamt-P/L

```
Total Premium Collected  = Σ alle Net Premiums (nach Commissions)
Total Buyback Cost       = Σ alle Buyback-Kosten + Σ Close-Commissions
Total Dividends          = Σ alle Netto-Dividenden im Zyklus
Stock Profit/Loss        = Verkaufserlös - Kaufkosten - Assignment/Called Away Commissions
Net Profit/Loss          = Total Premium - Buyback Cost + Stock P/L + Total Dividends
Total Commissions        = Σ alle Commissions im Zyklus (separate Anzeige)
```

#### 4.5.4 P/L mit/ohne Commission (Depot-Einstellung)

```
WENN depot.settings_include_commission_in_pl = TRUE:
    Net Premium       = Total Premium - Commission
    Realized P/L      = Net Premium - Buyback-Kosten - Close-Commission
    
WENN depot.settings_include_commission_in_pl = FALSE:
    Net Premium       = Total Premium (Commission ignoriert)
    Realized P/L      = Total Premium - Buyback-Kosten (Commissions ignoriert)
    
    ABER: Commission wird separat ausgewiesen:
    - "Realized P/L (vor Kosten): $500"
    - "Commissions: $15"
    - Für Steuer-Export: Nur P/L ohne Commission
```

#### 4.5.5 Partial Fill Aggregation

```
Wenn mehrere Fills zur gleichen Order gehören:

Aggregierte Quantity:    Σ fill_quantity
Durchschnittspreis:      Σ (fill_quantity × fill_price) / Σ fill_quantity
Gesamt-Commission:       Σ fill_commission

Beispiel:
  Fill 1: 1 Kontrakt @ $3.20, Commission $1.15
  Fill 2: 1 Kontrakt @ $3.25, Commission $1.15
  
  → Position: 2 Kontrakte @ $3.225 (Durchschnitt), Commission $2.30
```

### 4.6 IB-Import Feldmapping

| IB-Feld | Internes Feld | Transformation |
|---------|---------------|----------------|
| Symbol | ticker_id | Lookup oder Neuanlage |
| TradeDate | open_date / close_date | Parse YYYY-MM-DD |
| Expiry | expiration_date | Parse YYYYMMDD |
| Strike | strike_price | Direkt |
| Put/Call | position_type | "P" → SHORT_PUT, "C" → SHORT_CALL |
| Quantity | quantity | Negativ für Sell, Positiv für Buy |
| TradePrice | premium_per_contract | Direkt |
| IBCommission | commission | Absolutwert |
| OrderID | broker_order_id | Für Partial Fill Gruppierung |
| ExecID | broker_execution_id | Eindeutige Identifikation |
| AssetCategory | — | "OPT" oder "STK" zur Typ-Erkennung |
| Code | close_type | "A" → ASSIGNED, "Ep" → EXPIRED |

### 4.7 Validierungsregeln

| ID | Regel |
|----|-------|
| VAL-TJ-001 | Strike muss > 0 sein |
| VAL-TJ-002 | Expiration Date muss in der Zukunft liegen (bei Neuanlage) |
| VAL-TJ-003 | Quantity muss ≠ 0 sein |
| VAL-TJ-004 | Premium muss ≥ 0 sein |
| VAL-TJ-005 | Bei Covered Call: Ausreichend Aktien vorhanden (≥ Kontrakte × 100) |
| VAL-TJ-006 | Bei Roll: Neues Expiry muss nach Close-Datum liegen |
| VAL-TJ-007 | Bei Buyback: Preis muss ≥ 0 sein |
| VAL-TJ-008 | Delta muss zwischen -1 und 1 liegen |
| VAL-TJ-009 | IV muss zwischen 0% und 500% liegen |
| VAL-TJ-010 | Commission muss ≥ 0 sein |
| VAL-TJ-011 | Commission ist Pflichtfeld (kann 0 sein) |
| VAL-TJ-012 | Dividend per Share muss > 0 sein |
| VAL-TJ-013 | Ex-Dividend Date muss ≤ Payment Date sein |
| VAL-TJ-014 | Quellensteuer muss ≤ Brutto-Dividende sein |
| VAL-TJ-015 | Bei Import: Broker Trade ID darf nicht bereits existieren |

### 4.8 UI-Konzepte

#### 4.8.1 Trade-Übersicht (Dashboard)

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRADE JOURNAL          [Alle Depots     ▼]  [Import]  [+ Trade]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ OFFENE POSITIONEN ──────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Depot       Ticker  Type       Strike  Exp.     Qty  Prem.  │  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  IB Margin   AAPL    Short Put  $170    03/22    -2   $3.20  │  │
│  │  IB Margin   MSFT    Short Put  $400    03/15    -1   $5.50  │  │
│  │  Roth IRA    NVDA    Cov. Call  $900    03/22    -1   $12.00 │  │
│  │  Consors.    SAP     Short Put  €180    03/22    -1   €2.80  │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ LETZTE AKTIVITÄT ───────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  2024-03-08  AAPL  Short Put eröffnet    $170   -2   +$640   │  │
│  │  2024-03-07  MSFT  Short Put gerollt     $410→$400    +$85   │  │
│  │  2024-03-05  NVDA  Dividende erhalten                 +$40   │  │
│  │  2024-03-01  NVDA  Put assigned          $880   → +100 Sh.   │  │
│  │  2024-03-01  NVDA  Covered Call eröffnet $900   -1   +$1200  │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ WHEEL-ZYKLEN (aktiv) ───────────────────────────────────────┐  │
│  │                                                               │  │
│  │  NVDA-2024-02   Aktiv seit 45 Tagen                          │  │
│  │  └─ Put → Put (rolled) → Assigned → CC (offen)               │  │
│  │     Prämien: $2,340  |  Dividenden: $40  |  Total: $2,380    │  │
│  │                                                               │  │
│  │  AAPL-2024-03   Aktiv seit 7 Tagen                           │  │
│  │  └─ Put (offen)                                              │  │
│  │     Prämien: $640                                            │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ YTD SUMMARY ────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Depot          Prämien    Dividenden   Comm.    Net P/L     │  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  IB Margin      $8,450     $120         $187     $7,983      │  │
│  │  Roth IRA       $3,200     $220         $78      $3,342      │  │
│  │  Consorsbank    €1,800     €0           €45      €1,755      │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.8.2 Trade-Erfassung (Short Put)

```
┌─────────────────────────────────────────────────────────────────────┐
│  NEUER TRADE: SHORT PUT                                    [X]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Depot:           [IB Margin ▼]  ★                                  │
│  Ticker:          [AAPL       ▼]                                    │
│                                                                     │
│  ─── POSITION ───────────────────────────────────────────────────   │
│                                                                     │
│  Strike:          [$170.00    ]                                     │
│  Expiration:      [2024-03-22 📅]         DTE: 14 Tage              │
│  Quantity:        [-2         ]  Kontrakte                          │
│                                                                     │
│  Premium:         [$3.20      ]  pro Kontrakt                       │
│  Commission:      [$2.30      ]                                     │
│                   ─────────────                                     │
│  Total Premium:   $640.00                                           │
│  Net Premium:     $637.70     (nach Commission)                     │
│                                                                     │
│  ─── OPTIONAL ───────────────────────────────────────────────────   │
│                                                                     │
│  Underlying:      [$175.30    ]  (aktueller Kurs)                   │
│  Delta:           [0.25       ]                                     │
│  IV:              [32.5%      ]                                     │
│  IV Rank:         [45%        ]                                     │
│                                                                     │
│  ─── BERECHNET ──────────────────────────────────────────────────   │
│                                                                     │
│  Break-Even:      $166.80  (Strike - Premium)                       │
│  Max Profit:      $637.70  (wenn wertlos verfällt)                  │
│  Max Loss:        $33,360  (wenn Aktie auf $0)                      │
│                                                                     │
│  ─── NOTIZEN ────────────────────────────────────────────────────   │
│                                                                     │
│  [                                                              ]   │
│  [                                                              ]   │
│  [+ Screenshot hinzufügen]                                          │
│                                                                     │
│  [ ] Mit Trade-Idee verknüpfen: [Auswählen ▼]                       │
│                                                                     │
│                                    [Abbrechen]  [Trade eröffnen]    │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.8.3 Rollen-Dialog

```
┌─────────────────────────────────────────────────────────────────────┐
│  POSITION ROLLEN: AAPL Short Put                           [X]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ─── AKTUELLE POSITION ──────────────────────────────────────────   │
│                                                                     │
│  Strike: $170.00    Exp: 2024-03-15    Qty: -2    Premium: $3.20    │
│                                                                     │
│  ─── SCHLIESSEN (Buyback) ───────────────────────────────────────   │
│                                                                     │
│  Buyback-Preis:   [$1.50      ]  pro Kontrakt                       │
│  Commission:      [$2.30      ]                                     │
│  Buyback-Kosten:  $302.30     (inkl. Commission)                    │
│                                                                     │
│  ─── NEUE POSITION ──────────────────────────────────────────────   │
│                                                                     │
│  Neuer Strike:    [$165.00    ]   ← Roll Down ($5.00)               │
│  Neues Expiry:    [2024-03-22 📅]  ← Roll Out (+7 Tage)             │
│  Quantity:        [-2         ]                                     │
│  Neues Premium:   [$2.80      ]  pro Kontrakt                       │
│  Commission:      [$2.30      ]                                     │
│                                                                     │
│  ─── ROLL-ZUSAMMENFASSUNG ───────────────────────────────────────   │
│                                                                     │
│  Neues Premium:       +$560.00                                      │
│  Commission (neu):     -$2.30                                       │
│  Buyback-Kosten:      -$300.00                                      │
│  Commission (close):   -$2.30                                       │
│  ─────────────────────────────                                      │
│  Net Credit:          +$255.40  ✓                                   │
│                                                                     │
│  Roll-Typ:  Roll Out and Down                                       │
│                                                                     │
│                                    [Abbrechen]  [Roll ausführen]    │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.8.4 Position schließen

```
┌─────────────────────────────────────────────────────────────────────┐
│  POSITION SCHLIESSEN: AAPL Short Put                       [X]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Strike: $170.00    Exp: 2024-03-15    Qty: -2    Premium: $3.20    │
│                                                                     │
│  ─── SCHLIESSUNGSART ────────────────────────────────────────────   │
│                                                                     │
│  (○) Wertlos verfallen                                              │
│      → P/L: +$637.70 (100% Gewinn)                                  │
│                                                                     │
│  (●) Buyback                                                        │
│      Preis:      [$0.85      ]  pro Kontrakt                        │
│      Commission: [$2.30      ]                                      │
│                                                                     │
│      Buyback-Kosten:  $172.30  (inkl. Commission)                   │
│      → Net P/L:       +$465.40                                      │
│                                                                     │
│  (○) Assignment                                                     │
│      Commission: [$0.00      ]  (falls Broker berechnet)            │
│      → 200 Aktien zu $170.00 kaufen                                 │
│      → Adjusted Cost Basis: $166.81                                 │
│      → [Covered Call direkt eröffnen?]                              │
│                                                                     │
│  ─── NOTIZEN (Review) ───────────────────────────────────────────   │
│                                                                     │
│  [                                                              ]   │
│                                                                     │
│                                    [Abbrechen]  [Schließen]         │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.8.5 Dividenden-Erfassung

```
┌─────────────────────────────────────────────────────────────────────┐
│  DIVIDENDE ERFASSEN: NVDA                                  [X]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Aktienposition:  100 Shares @ $880.00 (NVDA-2024-02)              │
│                                                                     │
│  ─── DIVIDENDEN-DETAILS ─────────────────────────────────────────   │
│                                                                     │
│  Ex-Dividend Date:    [2024-03-05 📅]                               │
│  Payment Date:        [2024-03-15 📅]                               │
│                                                                     │
│  Dividend per Share:  [$0.40      ]                                 │
│  Shares:              [100        ]  (vorausgefüllt)                │
│                                                                     │
│  ─── BERECHNUNG ─────────────────────────────────────────────────   │
│                                                                     │
│  Brutto-Dividende:    $40.00                                        │
│  Quellensteuer (15%): [$6.00      ]                                 │
│                       ───────────                                   │
│  Netto-Dividende:     $34.00                                        │
│                                                                     │
│  ─── NOTIZEN ────────────────────────────────────────────────────   │
│                                                                     │
│  [                                                              ]   │
│                                                                     │
│                                    [Abbrechen]  [Speichern]         │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.8.6 Import-Dialog (Interactive Brokers)

```
┌─────────────────────────────────────────────────────────────────────┐
│  IMPORT: INTERACTIVE BROKERS                               [X]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Ziel-Depot:  [IB Margin ▼]                                         │
│                                                                     │
│  Datei:       [Activity_Statement_2024.csv    ] [Durchsuchen...]    │
│                                                                     │
│  ─── IMPORT-VORSCHAU ────────────────────────────────────────────   │
│                                                                     │
│  Gefunden: 23 Transaktionen                                         │
│                                                                     │
│  ✓  12 Options-Trades                                               │
│  ✓   4 Dividenden                                                   │
│  ✓   3 Assignments                                                  │
│  ⚠   2 Partial Fills (werden aggregiert)                           │
│  ⊘   2 Duplikate (werden übersprungen)                             │
│                                                                     │
│  ─── PARTIAL FILLS ──────────────────────────────────────────────   │
│                                                                     │
│  AAPL Put $170 03/22:                                               │
│    Fill 1: 1 @ $3.20  ($1.15 comm.)  14:32:05                      │
│    Fill 2: 1 @ $3.25  ($1.15 comm.)  14:32:07                      │
│    → Aggregiert: 2 @ $3.225  ($2.30 comm.)                         │
│                                                                     │
│  ─── ZUORDNUNG ──────────────────────────────────────────────────   │
│                                                                     │
│  ⚠ Buyback MSFT Put $400 → Offene Position gefunden [Zuordnen ▼]   │
│                                                                     │
│  ─── DUPLIKATE ──────────────────────────────────────────────────   │
│                                                                     │
│  ⊘ NVDA Dividend 2024-03-05 → bereits importiert am 2024-03-16     │
│  ⊘ AAPL Put $175 Open → bereits importiert am 2024-03-01           │
│                                                                     │
│                                                                     │
│  [Details anzeigen]            [Abbrechen]  [19 Transaktionen       │
│                                              importieren]           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Modul: Technisches Screening

### 5.1 Übersicht & Zweck

Das Screening-Tool ermöglicht die Filterung von Aktien anhand technischer Indikatoren. Der User definiert Kriterien pro Indikator, und das System gibt eine Liste der Aktien aus, die alle Kriterien erfüllen. Dies unterstützt die wöchentliche Analyse zur Identifikation potenzieller Wheel-Kandidaten.

### 5.2 User Stories

| ID | User Story | Priorität |
|----|------------|-----------|
| US-SC-01 | Als Trader möchte ich Aktien nach RSI-Werten filtern können (z.B. RSI < 40) | Must |
| US-SC-02 | Als Trader möchte ich Aktien nach Bollinger-Band-Position filtern können (z.B. unteres Drittel) | Must |
| US-SC-03 | Als Trader möchte ich mehrere Indikator-Kriterien kombinieren können (UND-Verknüpfung) | Must |
| US-SC-04 | Als Trader möchte ich die Indikator-Parameter für das Screening selbst festlegen können | Must |
| US-SC-05 | Als Trader möchte ich Screening-Profile speichern und wiederverwenden können | Should |
| US-SC-06 | Als Trader möchte ich die Ergebnisliste nach verschiedenen Kriterien sortieren können | Should |
| US-SC-07 | Als Trader möchte ich von der Ergebnisliste direkt zum Chart-Replay oder zur Trade-Erfassung springen können | Should |

### 5.3 Funktionale Anforderungen

#### 5.3.1 Screening-Ausführung

| ID | Anforderung |
|----|-------------|
| FR-SC-001 | Screening läuft über alle Ticker mit vorhandenen OHLCV-Daten |
| FR-SC-002 | Screening verwendet die aktuellste verfügbare Kerze (letztes Datum im Dataset) |
| FR-SC-003 | Screening kann auf Daily oder Weekly Timeframe ausgeführt werden |
| FR-SC-004 | Alle Kriterien werden mit UND verknüpft (Aktie muss alle erfüllen) |
| FR-SC-005 | Ergebnis zeigt: Ticker, aktueller Kurs, und Werte aller gescreenten Indikatoren |

#### 5.3.2 RSI-Kriterien

| ID | Anforderung |
|----|-------------|
| FR-SC-010 | **Parameter: Perioden** – konfigurierbar, Default: 14 |
| FR-SC-011 | **Operator:** kleiner als (<), größer als (>), zwischen (range) |
| FR-SC-012 | **Wert:** numerisch, 0–100 |
| FR-SC-013 | Beispiel: "RSI(14) < 40" oder "RSI(14) zwischen 30 und 50" |

#### 5.3.3 Bollinger-Band-Kriterien

| ID | Anforderung |
|----|-------------|
| FR-SC-020 | **Parameter: Perioden** – konfigurierbar, Default: 20 |
| FR-SC-021 | **Parameter: Standardabweichungen** – konfigurierbar, Default: 2.0 |
| FR-SC-022 | **Position-Kriterien:** |
| FR-SC-022a | "Preis im unteren Drittel" = Close < Lower Band + (Middle - Lower) / 3 |
| FR-SC-022b | "Preis im mittleren Drittel" = zwischen unterem und oberem Drittel |
| FR-SC-022c | "Preis im oberen Drittel" = Close > Upper Band - (Upper - Middle) / 3 |
| FR-SC-022d | "Preis unter Lower Band" = Close < Lower Band |
| FR-SC-022e | "Preis über Upper Band" = Close > Upper Band |
| FR-SC-023 | **Alternativ: %B-Wert** (0 = Lower Band, 1 = Upper Band) |
| FR-SC-023a | Beispiel: "%B < 0.33" entspricht "unteres Drittel" |

#### 5.3.4 SMA/EMA-Kriterien

| ID | Anforderung |
|----|-------------|
| FR-SC-030 | **Parameter: Perioden** – konfigurierbar |
| FR-SC-031 | **Kriterien:** |
| FR-SC-031a | "Preis über SMA(X)" = Close > SMA |
| FR-SC-031b | "Preis unter SMA(X)" = Close < SMA |
| FR-SC-031c | "SMA(X) über SMA(Y)" = Golden Cross Setup |
| FR-SC-031d | "SMA(X) unter SMA(Y)" = Death Cross Setup |
| FR-SC-032 | Gleiche Logik für EMA |

#### 5.3.5 MACD-Kriterien

| ID | Anforderung |
|----|-------------|
| FR-SC-040 | **Parameter:** Fast (12), Slow (26), Signal (9) – alle konfigurierbar |
| FR-SC-041 | **Kriterien:** |
| FR-SC-041a | "MACD > Signal" (bullish) |
| FR-SC-041b | "MACD < Signal" (bearish) |
| FR-SC-041c | "MACD > 0" (über Nulllinie) |
| FR-SC-041d | "MACD < 0" (unter Nulllinie) |
| FR-SC-041e | "Histogramm positiv" |
| FR-SC-041f | "Histogramm negativ" |

#### 5.3.6 Volume-Kriterien

| ID | Anforderung |
|----|-------------|
| FR-SC-050 | **Kriterien:** |
| FR-SC-050a | "Volume > X-faches des Durchschnitts" (z.B. > 1.5x SMA(20)) |
| FR-SC-050b | "Volume < X-faches des Durchschnitts" |

#### 5.3.7 Preis-Kriterien

| ID | Anforderung |
|----|-------------|
| FR-SC-060 | "Preis zwischen $X und $Y" – für Capital Efficiency |
| FR-SC-061 | "Preis > $X" oder "Preis < $Y" |

#### 5.3.8 Screening-Profile

| ID | Anforderung |
|----|-------------|
| FR-SC-070 | User kann aktuelle Kriterien-Kombination als Profil speichern |
| FR-SC-071 | **Pflichtfeld:** Profilname |
| FR-SC-072 | Profile werden persistent gespeichert |
| FR-SC-073 | Profile können geladen, bearbeitet und gelöscht werden |
| FR-SC-074 | Vordefinierte Profile (System-Templates): |
| FR-SC-074a | "Oversold Setup" = RSI(14) < 30 AND unteres BB-Drittel |
| FR-SC-074b | "Bullish Momentum" = RSI(14) > 50 AND MACD > Signal AND Preis > SMA(50) |

#### 5.3.9 Ergebnisliste

| ID | Anforderung |
|----|-------------|
| FR-SC-080 | Ergebnisse als Tabelle mit Spalten: Ticker, Name, Preis, und Werte aller aktiven Indikatoren |
| FR-SC-081 | Sortierung nach: Ticker, Preis, RSI, %B, oder beliebigem Indikator-Wert |
| FR-SC-082 | Klick auf Ticker → öffnet Chart-Replay für diesen Ticker |
| FR-SC-083 | Button "Trade erfassen" → öffnet Trade-Erfassung mit vorausgewähltem Ticker |
| FR-SC-084 | Export der Ergebnisliste als CSV |

### 5.4 Validierungsregeln

| ID | Regel |
|----|-------|
| VAL-SC-001 | Mindestens ein Kriterium muss aktiv sein |
| VAL-SC-002 | RSI-Wert muss zwischen 0 und 100 liegen |
| VAL-SC-003 | %B-Wert typischerweise zwischen -0.5 und 1.5 (kann außerhalb liegen) |
| VAL-SC-004 | Perioden müssen > 0 sein |
| VAL-SC-005 | Bei BETWEEN: value_1 < value_2 |
| VAL-SC-006 | Profilname muss eindeutig sein |
| VAL-SC-007 | System-Templates können nicht gelöscht oder überschrieben werden |

### 5.5 UI-Konzept: Screening-Tool

```
┌─────────────────────────────────────────────────────────────────────┐
│  TECHNISCHES SCREENING                    [Profil laden ▼] [Speichern] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Timeframe: (●) Daily  ( ) Weekly         [Screening starten]       │
│                                                                     │
│  ─── KRITERIEN ──────────────────────────────────────────────────   │
│                                                                     │
│  ┌─ RSI ────────────────────────────────────────────────────────┐  │
│  │ [✓] Aktiv   Perioden: [14]                                    │  │
│  │     Operator: [kleiner als ▼]  Wert: [40    ]                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Bollinger Bands ────────────────────────────────────────────┐  │
│  │ [✓] Aktiv   Perioden: [20]   Std.Abw.: [2.0]                  │  │
│  │     Position: [Unteres Drittel ▼]                             │  │
│  │     -- ODER --                                                │  │
│  │     %B: [kleiner als ▼]  Wert: [0.33  ]                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ SMA ────────────────────────────────────────────────────────┐  │
│  │ [ ] Aktiv   Perioden: [50 ]                                   │  │
│  │     Kriterium: [Preis über SMA ▼]                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ MACD ───────────────────────────────────────────────────────┐  │
│  │ [ ] Aktiv   Fast: [12]  Slow: [26]  Signal: [9]               │  │
│  │     Kriterium: [MACD > Signal ▼]                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Preis ──────────────────────────────────────────────────────┐  │
│  │ [ ] Aktiv   Min: [$20     ]  Max: [$100    ]                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [+ Weiteren Indikator hinzufügen]                                  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ─── ERGEBNISSE (7 von 45 Aktien) ───────────────────── [CSV Export]│
│                                                                     │
│  Ticker  Name              Preis    RSI(14)  %B     [Sort ▼]       │
│  ─────────────────────────────────────────────────────────────────  │
│  AAPL    Apple Inc.        $168.50  38.2     0.28   [Chart] [Trade] │
│  MSFT    Microsoft Corp.   $402.30  35.6     0.31   [Chart] [Trade] │
│  GOOGL   Alphabet Inc.     $175.20  39.1     0.25   [Chart] [Trade] │
│  JPM     JPMorgan Chase    $198.40  37.8     0.29   [Chart] [Trade] │
│  V       Visa Inc.         $285.60  36.4     0.22   [Chart] [Trade] │
│  PG      Procter & Gamble  $165.80  38.9     0.30   [Chart] [Trade] │
│  JNJ     Johnson & Johnson $158.20  34.2     0.18   [Chart] [Trade] │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Modul: Fundamentale Analyse

*Wird separat spezifiziert – Framework aus Deep Research verfügbar.*

### 6.1 Übersicht

Das Fundamentale-Analyse-Modul dient als "Red Flag Screening" für potenzielle Wheel-Kandidaten. Ziel ist die systematische Identifikation von Risiken, die zu 30%+ Kurseinbrüchen führen können.

### 6.2 Kernbereiche (Vorschau)

1. **Hard Exclusions** – Automatische Ausschlüsse (Biotech mit FDA-Events, SPACs, Meme-Stocks, etc.)
2. **Financial Health Screening** – Altman Z-Score, Debt/Equity, Interest Coverage, FCF
3. **Event Calendar** – Earnings, FDA-Dates, Litigation
4. **Qualitative Red Flags** – Insider Selling, Management Changes, Audit Issues
5. **Sector/Industry Analysis** – Branchenspezifische Risiken

*Detaillierte Spezifikation folgt.*

---

## 7. Modul: Internationalisierung (i18n)

### 7.1 Übersicht & Zweck

Das System unterstützt mehrere Sprachen, um eine breitere Nutzerbasis zu ermöglichen. Initial werden Englisch und Deutsch unterstützt.

### 7.2 User Stories

| ID | User Story | Priorität |
|----|------------|-----------|
| US-I18N-01 | Als User möchte ich die Sprache der Anwendung auf Englisch oder Deutsch einstellen können | Must |
| US-I18N-02 | Als User möchte ich, dass meine Spracheinstellung gespeichert bleibt | Must |
| US-I18N-03 | Als User möchte ich die Sprache jederzeit wechseln können | Must |

### 7.3 Funktionale Anforderungen

#### 7.3.1 Sprachunterstützung

| ID | Anforderung |
|----|-------------|
| FR-I18N-001 | System unterstützt zwei Sprachen: Englisch (en), Deutsch (de) |
| FR-I18N-002 | Default-Sprache: Englisch |
| FR-I18N-003 | Sprachauswahl über Dropdown in der Navigation oder Settings |
| FR-I18N-004 | Sprachwechsel erfolgt sofort ohne Seiten-Reload (SPA-Verhalten) |
| FR-I18N-005 | Spracheinstellung wird persistent gespeichert (LocalStorage oder User-Settings) |

#### 7.3.2 Übersetzungsumfang

| ID | Anforderung |
|----|-------------|
| FR-I18N-006 | Alle UI-Texte, Labels, Buttons, Fehlermeldungen werden übersetzt |
| FR-I18N-007 | Datumsformate passen sich an: EN = MM/DD/YYYY, DE = DD.MM.YYYY |
| FR-I18N-008 | Zahlenformate passen sich an: EN = 1,234.56, DE = 1.234,56 |
| FR-I18N-009 | Währungsformate passen sich an: EN = $1,234.56, DE = 1.234,56 $ |
| FR-I18N-010 | Ticker-Symbole, Strike-Preise und berechnete Werte bleiben unverändert (keine Übersetzung) |

### 7.4 Übersetzungs-Scope

| Bereich | Englisch | Deutsch |
|---------|----------|---------|
| **Navigation** | Dashboard | Dashboard |
| | Trades | Trades |
| | Chart Replay | Chart-Wiedergabe |
| | Screening | Screening |
| | Settings | Einstellungen |
| **Buttons** | Save | Speichern |
| | Cancel | Abbrechen |
| | Add Trade | Trade hinzufügen |
| | Roll Position | Position rollen |
| | Close Position | Position schließen |
| **Labels** | Strike Price | Strike-Preis |
| | Expiration Date | Verfallsdatum |
| | Premium | Prämie |
| | Commission | Kommission |
| | Quantity | Anzahl |
| **Enums** | Short Put | Verkaufter Put |
| | Covered Call | Gedeckter Call |
| | Expired | Verfallen |
| | Assigned | Eingebucht |
| | Rolled | Gerollt |
| **Fehlermeldungen** | Strike must be greater than 0 | Strike muss größer als 0 sein |
| | Expiration date required | Verfallsdatum erforderlich |
| | Insufficient shares for covered call | Nicht genug Aktien für gedeckten Call |
| **Tooltips** | Days to Expiration | Tage bis Verfall |
| | Implied Volatility | Implizite Volatilität |
| | Break-Even Price | Break-Even-Preis |
| **Datumsangaben** | March 15, 2024 | 15. März 2024 |
| | Mon, Mar 15 | Mo, 15. Mär |

### 7.5 UI-Konzept: Sprachauswahl

**Option A: In der Navigation**

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRADING JOURNAL    [Dashboard] [Trades] [Chart] [Screening]       │
│                                                          [EN ▼] [⚙] │
│                                                    ┌─────────┐      │
│                                                    │ English │      │
│                                                    │ Deutsch │      │
│                                                    └─────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

**Option B: In den Settings**

```
┌─────────────────────────────────────────────────────────────────────┐
│  SETTINGS / EINSTELLUNGEN                                  [X]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ─── LANGUAGE / SPRACHE ─────────────────────────────────────────   │
│                                                                     │
│  Select language / Sprache wählen:                                  │
│                                                                     │
│  (●) English                                                        │
│  ( ) Deutsch                                                        │
│                                                                     │
│  ─── DATE & NUMBER FORMAT ───────────────────────────────────────   │
│                                                                     │
│  Date format:     [MM/DD/YYYY ▼]  (follows language by default)     │
│  Number format:   [1,234.56 ▼]    (follows language by default)     │
│                                                                     │
│                                         [Cancel]  [Save]            │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.6 Technische Implementierung

| Aspekt | Empfehlung |
|--------|------------|
| **i18n-Framework** | i18next (React), vue-i18n (Vue), oder angular-i18n |
| **Übersetzungsdateien** | JSON-Format: `en.json`, `de.json` |
| **Datumsformatierung** | date-fns oder Intl.DateTimeFormat |
| **Zahlenformatierung** | Intl.NumberFormat |
| **Speicherung** | LocalStorage (`app_language: "de"`) |

### 7.7 Beispiel Übersetzungsdateien

```json
// en.json
{
  "nav": {
    "dashboard": "Dashboard",
    "trades": "Trades",
    "chartReplay": "Chart Replay",
    "screening": "Screening",
    "settings": "Settings"
  },
  "trade": {
    "shortPut": "Short Put",
    "coveredCall": "Covered Call",
    "strikePrice": "Strike Price",
    "expirationDate": "Expiration Date",
    "premium": "Premium",
    "commission": "Commission",
    "quantity": "Quantity"
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "addTrade": "Add Trade",
    "rollPosition": "Roll Position"
  },
  "errors": {
    "strikeRequired": "Strike must be greater than 0",
    "expirationRequired": "Expiration date is required"
  }
}
```

```json
// de.json
{
  "nav": {
    "dashboard": "Dashboard",
    "trades": "Trades",
    "chartReplay": "Chart-Wiedergabe",
    "screening": "Screening",
    "settings": "Einstellungen"
  },
  "trade": {
    "shortPut": "Verkaufter Put",
    "coveredCall": "Gedeckter Call",
    "strikePrice": "Strike-Preis",
    "expirationDate": "Verfallsdatum",
    "premium": "Prämie",
    "commission": "Kommission",
    "quantity": "Anzahl"
  },
  "buttons": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "addTrade": "Trade hinzufügen",
    "rollPosition": "Position rollen"
  },
  "errors": {
    "strikeRequired": "Strike muss größer als 0 sein",
    "expirationRequired": "Verfallsdatum erforderlich"
  }
}
```

---

## 8. Datenmodell (Gesamt)

### 8.1 Entity-Relationship-Übersicht

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Depot     │───────│   Ticker    │───────│  OHLCV_Data │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │                      
      │                     │                      
      ▼                     ▼                      
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│Trade_Position│──────│ Wheel_Cycle │───────│  Dividend   │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │                      
      │                     │                      
      ▼                     ▼                      
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ Trade_Note  │───────│Trade_Screen-│       │Partial_Fill │
│             │       │    shot     │       │             │
└─────────────┘       └─────────────┘       └─────────────┘
      │                                            
      ▼                                            
┌─────────────┐       ┌─────────────┐              
│Trade_Trans- │───────│Import_Batch │              
│   action    │       │             │              
└─────────────┘       └─────────────┘              
```

### 8.2 Tabellen-Definitionen

#### Depot

```sql
Depot
├── depot_id (PK)
├── name (VARCHAR, UNIQUE, NOT NULL)
├── broker_name (VARCHAR, optional)
├── account_number (VARCHAR, optional)
├── description (TEXT, optional)
├── currency (VARCHAR, Default: 'USD')
├── is_default (BOOLEAN, Default: FALSE)
├── is_archived (BOOLEAN, Default: FALSE)
├── settings_include_commission_in_pl (BOOLEAN, Default: TRUE)
├── settings_default_withholding_tax_pct (DECIMAL, Default: 0)
├── settings_tax_reporting_mode (VARCHAR, NULL)
├── created_at (DATETIME)
└── updated_at (DATETIME)
```

#### Ticker

```sql
Ticker
├── ticker_id (PK)
├── symbol (VARCHAR, UNIQUE, NOT NULL, z.B. "AAPL")
├── name (VARCHAR, z.B. "Apple Inc.")
├── sector (VARCHAR, optional)
├── industry (VARCHAR, optional)
└── created_at (DATETIME)
```

#### OHLCV_Data

```sql
OHLCV_Data
├── data_id (PK)
├── ticker_id (FK → Ticker)
├── date (DATE)
├── timeframe (ENUM: 'D', 'W')
├── open (DECIMAL)
├── high (DECIMAL)
├── low (DECIMAL)
├── close (DECIMAL)
├── volume (BIGINT)
├── day_of_week (INT, 0=Mo, 4=Fr)
└── UNIQUE(ticker_id, date, timeframe)
```

#### Trade_Position

```sql
Trade_Position
├── trade_id (PK)
├── depot_id (FK → Depot, NOT NULL)
├── ticker_id (FK → Ticker, NOT NULL)
├── position_type (ENUM: 'SHORT_PUT', 'SHORT_CALL', 'LONG_STOCK')
├── status (ENUM: 'OPEN', 'CLOSED')
│
├── -- Options-spezifisch --
├── strike_price (DECIMAL, NULL für LONG_STOCK)
├── expiration_date (DATE, NULL für LONG_STOCK)
├── quantity (INT, negativ für Short)
├── premium_per_contract (DECIMAL)
├── delta_at_open (DECIMAL, optional)
├── iv_at_open (DECIMAL, optional)
├── iv_rank_at_open (DECIMAL, optional)
├── underlying_price_at_open (DECIMAL)
│
├── -- Aktien-spezifisch --
├── shares (INT, NULL für Options)
├── cost_per_share (DECIMAL)
│
├── -- Datum --
├── open_date (DATE)
├── close_date (DATE, NULL)
│
├── -- Schließung --
├── close_type (ENUM: 'EXPIRED', 'BUYBACK', 'ROLLED', 'ASSIGNED', 'CALLED_AWAY', NULL)
├── close_price (DECIMAL, NULL)
│
├── -- Commissions --
├── commission_open (DECIMAL)
├── commission_close (DECIMAL, NULL)
│
├── -- Verknüpfungen --
├── rolled_from_trade_id (FK → Trade_Position, NULL)
├── assigned_to_stock_id (FK → Trade_Position, NULL)
├── covered_by_stock_id (FK → Trade_Position, NULL)
├── wheel_cycle_id (FK → Wheel_Cycle, NULL)
│
├── -- Broker-Import --
├── broker_trade_id (VARCHAR, NULL)
├── import_batch_id (FK → Import_Batch, NULL)
│
├── -- Berechnet --
├── total_premium (DECIMAL)
├── net_premium (DECIMAL)
├── realized_pl (DECIMAL, NULL)
├── break_even (DECIMAL)
├── dte_at_open (INT)
│
├── created_at (DATETIME)
└── updated_at (DATETIME)
```

#### Wheel_Cycle

```sql
Wheel_Cycle
├── cycle_id (PK)
├── depot_id (FK → Depot, NOT NULL)
├── ticker_id (FK → Ticker, NOT NULL)
├── cycle_number (INT)
├── year (INT)
├── start_date (DATE)
├── end_date (DATE, NULL)
├── status (ENUM: 'ACTIVE', 'COMPLETED')
│
├── -- Aggregiert (berechnet) --
├── total_premium_collected (DECIMAL)
├── total_buyback_cost (DECIMAL)
├── total_commissions (DECIMAL)
├── total_dividends (DECIMAL)
├── stock_profit_loss (DECIMAL)
├── net_profit_loss (DECIMAL)
├── duration_days (INT)
│
└── created_at (DATETIME)
```

#### Dividend

```sql
Dividend
├── dividend_id (PK)
├── depot_id (FK → Depot, NOT NULL)
├── stock_position_id (FK → Trade_Position)
├── ticker_id (FK → Ticker)
├── wheel_cycle_id (FK → Wheel_Cycle, NULL)
│
├── ex_dividend_date (DATE)
├── payment_date (DATE)
├── record_date (DATE, optional)
│
├── shares_held (INT)
├── dividend_per_share (DECIMAL)
├── gross_amount (DECIMAL)
├── withholding_tax (DECIMAL, Default: 0)
├── net_amount (DECIMAL)
│
├── currency (VARCHAR, Default: 'USD')
│
├── -- Broker-Import --
├── broker_transaction_id (VARCHAR, NULL)
├── import_batch_id (FK → Import_Batch, NULL)
│
└── created_at (DATETIME)
```

#### Trade_Note

```sql
Trade_Note
├── note_id (PK)
├── trade_id (FK → Trade_Position, NULL)
├── ticker_id (FK → Ticker, NULL)
├── note_type (ENUM: 'IDEA', 'SETUP', 'MANAGEMENT', 'REVIEW')
├── note_date (DATE)
├── note_text (TEXT)
├── is_linked_to_trade (BOOLEAN)
└── created_at (DATETIME)
```

#### Trade_Screenshot

```sql
Trade_Screenshot
├── screenshot_id (PK)
├── note_id (FK → Trade_Note)
├── file_path (VARCHAR)
├── file_name (VARCHAR)
├── caption (VARCHAR, optional)
├── sort_order (INT)
└── created_at (DATETIME)
```

#### Trade_Transaction

```sql
Trade_Transaction
├── transaction_id (PK)
├── trade_id (FK → Trade_Position)
├── transaction_type (ENUM: 'OPEN', 'ROLL_CLOSE', 'ROLL_OPEN', 'BUYBACK', 'ASSIGNMENT', 'CALLED_AWAY', 'EXPIRE')
├── transaction_date (DATE)
├── price (DECIMAL)
├── quantity (INT)
├── commission (DECIMAL)
│
├── -- Partial Fill Tracking --
├── is_partial_fill (BOOLEAN, Default: FALSE)
├── fill_sequence (INT, NULL)
├── broker_order_id (VARCHAR, NULL)
├── broker_execution_id (VARCHAR, NULL)
│
└── created_at (DATETIME)
```

#### Partial_Fill

```sql
Partial_Fill
├── fill_id (PK)
├── trade_id (FK → Trade_Position)
├── transaction_id (FK → Trade_Transaction)
│
├── fill_datetime (DATETIME)
├── fill_quantity (INT)
├── fill_price (DECIMAL)
├── fill_commission (DECIMAL)
│
├── broker_execution_id (VARCHAR)
│
└── created_at (DATETIME)
```

#### Import_Batch

```sql
Import_Batch
├── batch_id (PK)
├── depot_id (FK → Depot, NOT NULL)
├── import_date (DATETIME)
├── source (ENUM: 'INTERACTIVE_BROKERS', 'MANUAL', 'OTHER')
├── file_name (VARCHAR)
│
├── records_total (INT)
├── records_imported (INT)
├── records_skipped (INT)
├── records_duplicate (INT)
│
├── status (ENUM: 'PENDING', 'COMPLETED', 'PARTIAL', 'FAILED')
├── error_log (TEXT, NULL)
│
└── created_at (DATETIME)
```

#### Chart_Note (für Chart-Replay)

```sql
Chart_Note
├── note_id (PK)
├── ticker_id (FK → Ticker)
├── date (DATE)
├── note_text (TEXT)
├── screenshot_path (VARCHAR, optional)
└── created_at (DATETIME)
```

#### Replay_Session (für Chart-Replay)

```sql
Replay_Session
├── session_id (PK)
├── ticker_id (FK → Ticker)
├── current_date (DATE)
├── timeframe (ENUM: 'D', 'W')
├── viewport_size (INT)
└── last_accessed (DATETIME)
```

#### Screening_Profile (für Technisches Screening)

```sql
Screening_Profile
├── profile_id (PK)
├── name (VARCHAR, UNIQUE, NOT NULL)
├── description (TEXT, optional)
├── timeframe (ENUM: 'D', 'W', Default: 'D')
├── is_system_template (BOOLEAN, Default: FALSE)
├── created_at (DATETIME)
└── updated_at (DATETIME)
```

#### Screening_Criterion (für Technisches Screening)

```sql
Screening_Criterion
├── criterion_id (PK)
├── profile_id (FK → Screening_Profile)
├── indicator_type (ENUM: 'RSI', 'BB', 'SMA', 'EMA', 'MACD', 'VOLUME', 'PRICE')
├── is_active (BOOLEAN, Default: TRUE)
│
├── -- Indikator-Parameter --
├── param_period (INT, NULL)           -- RSI, BB, SMA, EMA Perioden
├── param_period_2 (INT, NULL)         -- MACD Slow, oder SMA-Vergleich
├── param_period_3 (INT, NULL)         -- MACD Signal
├── param_std_dev (DECIMAL, NULL)      -- BB Standardabweichung
│
├── -- Kriterium --
├── operator (ENUM: 'LT', 'GT', 'BETWEEN', 'EQ', 'POSITION')
├── value_1 (DECIMAL, NULL)
├── value_2 (DECIMAL, NULL)            -- für BETWEEN
├── position_value (ENUM: 'LOWER_THIRD', 'MIDDLE_THIRD', 'UPPER_THIRD', 
│                         'BELOW_LOWER', 'ABOVE_UPPER', NULL)
│
├── sort_order (INT)
└── created_at (DATETIME)
```

#### User_Settings (für Internationalisierung)

```sql
User_Settings
├── setting_id (PK)
├── setting_key (VARCHAR, UNIQUE, NOT NULL)
├── setting_value (VARCHAR)
├── updated_at (DATETIME)
│
├── -- Beispiel-Einträge: --
├── -- 'language' → 'en' oder 'de'
├── -- 'date_format' → 'MM/DD/YYYY' oder 'DD.MM.YYYY'
├── -- 'number_format' → 'en-US' oder 'de-DE'
└── -- 'theme' → 'light' oder 'dark' (für spätere Erweiterung)
```

---

## 9. Nicht-funktionale Anforderungen

### 9.1 Performance

| ID | Anforderung |
|----|-------------|
| NFR-001 | Seitenaufbau Dashboard < 2 Sekunden |
| NFR-002 | Trade-Erfassung Speichern < 500ms |
| NFR-003 | Chart-Navigation (Kerze vor/zurück) < 50ms |
| NFR-004 | IB-Import von 500 Transaktionen < 10 Sekunden |

### 9.2 Datensicherheit

| ID | Anforderung |
|----|-------------|
| NFR-010 | Alle Daten werden lokal gespeichert |
| NFR-011 | Optional: Export/Backup als JSON oder SQLite |
| NFR-012 | Keine Übertragung sensibler Daten an externe Server |

### 9.3 Benutzerfreundlichkeit

| ID | Anforderung |
|----|-------------|
| NFR-020 | Responsive Design (Desktop-first, Tablet-kompatibel) |
| NFR-021 | Tastaturnavigation für häufige Aktionen |
| NFR-022 | Undo-Funktion für Trade-Löschungen (Soft Delete) |

### 9.4 Erweiterbarkeit

| ID | Anforderung |
|----|-------------|
| NFR-030 | Modulare Architektur für spätere Erweiterungen |
| NFR-031 | API-fähiges Backend für potenzielle Automatisierung |
| NFR-032 | Plugin-System für zusätzliche Broker-Importe vorbereiten |

---

## 10. Offene Punkte / Roadmap

### Phase 1 (MVP)
- [ ] Depot-Verwaltung
- [ ] Trade-Journal (manuelle Erfassung)
- [ ] Basis-Auswertungen (Offene Positionen, P/L)
- [ ] Internationalisierung (Englisch/Deutsch)

### Phase 2
- [ ] Chart-Replay mit Indikatoren
- [ ] Trade-Visualisierung im Chart
- [ ] Technisches Screening-Tool
- [ ] IB-Import

### Phase 3
- [ ] Fundamentale Analyse Framework
- [ ] Erweiterte Auswertungen
- [ ] Steuer-Reporting

### Phase 4
- [ ] Automatisierung (API für Datenquellen)
- [ ] Alerts und Benachrichtigungen
- [ ] Mobile-Optimierung

---

## Anhang A: Glossar

| Begriff | Definition |
|---------|------------|
| CSP | Cash-Secured Put – Short Put mit ausreichend Cash zur Deckung |
| CC | Covered Call – Short Call gedeckt durch Aktienbesitz |
| DTE | Days to Expiration – Tage bis zum Verfall |
| IV | Implied Volatility – Implizite Volatilität |
| P/L | Profit/Loss – Gewinn/Verlust |
| Roll | Schließen einer Position und Eröffnen einer neuen mit anderem Strike/Expiry |
| Wheel | Strategie: CSP → (Assignment) → CC → (Called Away) → Repeat |
| Assignment | Ausübung einer Option durch den Käufer |

---

## Anhang B: Versionshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2025-01-11 | Initiale Spezifikation |
| 1.1 | 2025-01-11 | Technisches Screening-Modul hinzugefügt |
| 1.2 | 2025-01-11 | Internationalisierung (i18n) Modul hinzugefügt |
