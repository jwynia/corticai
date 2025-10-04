# Chain Classification Standards

## Purpose
Provides consistent chain classification across all metro areas in The Whereness System. Enables users to filter between chain and independent businesses regardless of which city guide they're using.

## Cross-Cutting Nature
Chain classification is a **project-wide standard** because:
- Same brands appear across multiple metros (Starbucks, Circle K, Marriott)
- Users expect consistent classification (McDonald's should always be "international")
- Filtering logic remains identical across cities
- Brand relationships transcend individual metro boundaries

## Schema Standard

### chain_type Field (Required)
String enum with exactly these values:

- `""` (empty string) - Independent business, not part of a chain
- `"local"` - Multiple locations within same metro area only
- `"regional"` - Multiple locations across state or region
- `"national"` - Locations across the United States
- `"international"` - Global presence

### Implementation Rules

#### Empty String for Independents
Always use empty string `""` (not `null`, `undefined`, or `"independent"`):
```json
{
  "id": "abq-humble-coffee",
  "name": "Humble Coffee",
  "chain_type": ""
}
```

#### Consistent Brand Classification
Same brand gets same classification across all cities:
```json
// Minneapolis
{
  "id": "msp-starbucks-nicollet",
  "name": "Starbucks",
  "chain_type": "international"
}

// Albuquerque
{
  "id": "abq-starbucks-uptown",
  "name": "Starbucks",
  "chain_type": "international"
}
```

## Standard Classifications by Industry

### Gas Stations / Convenience
- **International**: Circle K, 7-Eleven, Shell, BP
- **National**: Love's Travel Stop, Pilot, Casey's, Wawa
- **Regional**: Allsup's (Southwest), Kwik Trip (Midwest), Sheetz (East)

### Coffee Shops
- **International**: Starbucks, Dunkin'
- **National**: Caribou Coffee, Peet's Coffee
- **Regional**: Dutch Bros (West), Tim Hortons (North)
- **Local**: Spyhouse (Minneapolis), Humble Coffee (Albuquerque)

### Hotels
- **International**: Marriott, Hilton, Hyatt, IHG brands
- **National**: Best Western, Choice Hotels, Wyndham
- **Regional**: Drury Hotels (Midwest), Aloft (varies by market)

### Restaurants - Fast Food
- **International**: McDonald's, KFC, Burger King, Pizza Hut, Domino's
- **National**: Chipotle, Panera, Five Guys, In-N-Out
- **Regional**: Culver's (Midwest), White Castle (Midwest), Blake's Lotaburger (New Mexico)

### Restaurants - Casual/Fine
- **International**: Applebee's, TGI Friday's, Hard Rock Cafe
- **National**: Olive Garden, Red Lobster, Cheesecake Factory
- **Regional**: Varies significantly by region
- **Local**: Most independent restaurants

### Retail
- **International**: Walmart, Target, Best Buy, Home Depot
- **National**: CVS, Walgreens, GameStop, RadioShack
- **Regional**: HEB (Texas), Wegmans (Northeast), King Soopers (Colorado)

## Decision Guidelines

### When to Classify as "Local"
- Multiple locations within same metro area
- Single ownership/management
- Metro-specific branding or menu
- Examples: Golden Pride (Albuquerque), Spyhouse (Minneapolis)

### When to Classify as "Regional"
- Locations across multiple states in a region
- Regional branding or specialization
- Examples: Blake's Lotaburger (New Mexico), Culver's (Midwest), Meow Wolf (Southwest)

### When to Classify as "National"
- Locations across multiple US regions
- Consistent branding coast-to-coast
- Examples: Chipotle, Best Western, Love's Travel Stop

### When to Classify as "International"
- Locations outside the United States
- Global brand recognition
- Examples: McDonald's, Starbucks, Marriott, Circle K

## Edge Cases

### Franchises vs Corporate
Classification based on brand reach, not ownership structure:
```json
// McDonald's franchise = still international
{
  "name": "McDonald's",
  "chain_type": "international"
}
```

### Regional Chains Expanding
Use current reach, not historical:
```json
// Dutch Bros expanding nationally
{
  "name": "Dutch Bros Coffee",
  "chain_type": "national"  // Updated from "regional"
}
```

### Local Chains with Same Name
Different metros can have unrelated local chains with similar names:
```json
// Minneapolis
{
  "id": "msp-town-talk-diner",
  "name": "Town Talk Diner",
  "chain_type": "local"
}

// Could exist elsewhere as different local chain
{
  "id": "den-town-talk-cafe",
  "name": "Town Talk Cafe",
  "chain_type": ""  // Actually independent, different business
}
```

## Implementation Across Cities

### Project Standards Repository
This file serves as the single source of truth for:
- Classification criteria
- Standard brand classifications
- Decision guidelines
- Edge case handling

### City-Specific Documentation
Individual city contexts should:
- Reference this standard
- Document local chains specific to their metro
- Note any regional variations
- Track classification decisions

### Discovery Tool Integration
Extraction tools should:
- Reference known brand classifications
- Flag unknown chains for manual review
- Ensure consistent classification across discoveries

## Usage Patterns

### Filter for Local Businesses Only
```javascript
const localOnly = entities.filter(e => e.chain_type === "");
```

### Filter for Local + Regional
```javascript
const localAndRegional = entities.filter(e =>
  e.chain_type === "" || e.chain_type === "local" || e.chain_type === "regional"
);
```

### Filter for Chains Only
```javascript
const chainsOnly = entities.filter(e => e.chain_type !== "");
```

### Filter by Chain Level
```javascript
const bigChains = entities.filter(e =>
  ["national", "international"].includes(e.chain_type)
);
```

## Maintenance

### Regular Review
- Quarterly review of regional chains for expansion status
- Annual review of classification standards
- Update as brands expand or change market presence

### Cross-City Consistency Checks
- Verify same brands have same classification across cities
- Flag inconsistencies for review
- Maintain canonical brand classification list

## Related Documents
- [ADR 004: Entity Structure Improvements](../decisions/004-entity-structure-improvements.md)
- [Place Network Pattern](../patterns/place-network.md)
- City-specific chain pattern documents in `/data/{city}/context/patterns/`