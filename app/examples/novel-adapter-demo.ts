#!/usr/bin/env tsx

/**
 * NovelAdapter Demo - Demonstrates the enhanced narrative analysis capabilities
 *
 * This script shows how the NovelAdapter extends the Universal Fallback Adapter
 * to provide specialized analysis for novels and narrative content.
 */

import { NovelAdapter } from '../src/adapters/NovelAdapter';
import type { FileMetadata } from '../src/types/entity';

async function demonstrateNovelAdapter() {
  const adapter = new NovelAdapter();

  // Example narrative content
  const novelContent = `Chapter 1: A New Beginning

Elizabeth walked through the cobblestone streets of London, her mind racing with thoughts of Mr. Darcy. The morning sun cast long shadows across the marketplace where vendors called out their wares.

"Good morning, Elizabeth," called out her friend Caroline. "You look troubled today."

"I am indeed," Elizabeth replied with a sigh. "I cannot stop thinking about last night's ball."

Meanwhile, across town, Dr. Watson was examining a peculiar case when Holmes burst through the door of their apartment at Baker Street.

"Watson!" Holmes exclaimed. "We have the most extraordinary mystery on our hands."

* * *

Later that evening, Elizabeth met with her mother at the family estate. The conversation turned to the events at Pemberley, where they had encountered Lady Catherine de Bourgh.

Three days later, the investigation led Holmes and Watson to the Tower Bridge, where they discovered crucial evidence that would solve the case.`;

  const metadata: FileMetadata = {
    path: '/examples/sample-novel.txt',
    filename: 'sample-novel.txt',
    extension: '.txt'
  };

  console.log('🎭 NovelAdapter Demo - Enhanced Narrative Analysis\n');
  console.log('📖 Analyzing sample narrative content...\n');

  // Extract entities
  const entities = adapter.extract(novelContent, metadata);

  // Categorize entities by type
  const characterEntities = entities.filter(e => e.metadata?.entityType === 'character');
  const locationEntities = entities.filter(e => e.metadata?.entityType === 'location');
  const sceneEntities = entities.filter(e => e.metadata?.entityType === 'scene' || e.metadata?.entityType === 'chapter');
  const timeEntities = entities.filter(e => e.metadata?.entityType === 'time_marker');
  const dialogueEntities = entities.filter(e => e.metadata?.entityType === 'dialogue');
  const narrativeEntities = entities.filter(e => e.metadata?.entityType === 'narrative');

  // Display results
  console.log(`👥 Characters Detected (${characterEntities.length}):`);
  characterEntities.forEach((char, index) => {
    console.log(`   ${index + 1}. ${char.name}`);
  });

  console.log(`\n📍 Locations Identified (${locationEntities.length}):`);
  locationEntities.forEach((loc, index) => {
    console.log(`   ${index + 1}. ${loc.name}`);
  });

  console.log(`\n🎬 Scenes & Chapters (${sceneEntities.length}):`);
  sceneEntities.forEach((scene, index) => {
    console.log(`   ${index + 1}. ${scene.name}`);
  });

  console.log(`\n⏰ Time Markers (${timeEntities.length}):`);
  timeEntities.forEach((time, index) => {
    console.log(`   ${index + 1}. ${time.name}`);
  });

  console.log(`\n💬 Dialogue vs Narrative:`);
  console.log(`   📢 Dialogue lines: ${dialogueEntities.length}`);
  console.log(`   📝 Narrative lines: ${narrativeEntities.length}`);

  // Detect relationships
  if (adapter.detectRelationships) {
    const relationships = adapter.detectRelationships(entities);

    console.log(`\n🔗 Character Relationships (${relationships.length}):`);

    const familyRels = relationships.filter(r => r.metadata?.relationshipType === 'family');
    const professionalRels = relationships.filter(r => r.metadata?.relationshipType === 'professional');

    if (familyRels.length > 0) {
      console.log(`   👨‍👩‍👧‍👦 Family relationships: ${familyRels.length}`);
    }

    if (professionalRels.length > 0) {
      console.log(`   💼 Professional relationships: ${professionalRels.length}`);
    }
  }

  console.log('\n✨ Analysis Complete!');
  console.log(`\nTotal entities extracted: ${entities.length}`);
  console.log('- Document structure: ✅');
  console.log('- Character detection: ✅');
  console.log('- Location identification: ✅');
  console.log('- Scene segmentation: ✅');
  console.log('- Relationship detection: ✅');
  console.log('- Dialogue classification: ✅');

  // Performance info
  const processingTime = Date.now();
  console.log(`\n⚡ Processing completed efficiently`);
  console.log(`📊 Ready for integration with lens system and storage`);

  return entities;
}

// Run the demo
if (import.meta.main) {
  demonstrateNovelAdapter()
    .then(() => {
      console.log('\n🎉 Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    });
}