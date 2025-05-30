const Badge = require("../models/badge")

const defaultBadges = [
  {
    name: "First Steps",
    description: "Complete your first course",
    category: "milestone",
    criteria: {
      type: "course_completion",
      value: 1,
    },
    pointsReward: 50,
    rarity: "common",
  },
  {
    name: "Knowledge Seeker",
    description: "Complete 5 courses",
    category: "milestone",
    criteria: {
      type: "course_completion",
      value: 5,
    },
    pointsReward: 100,
    rarity: "rare",
  },
  {
    name: "Smart Contract Expert",
    description: "Master blockchain development",
    category: "skill_mastery",
    criteria: {
      type: "skill_completion",
      value: 1,
      skillArea: "blockchain",
    },
    pointsReward: 200,
    rarity: "epic",
  },
  {
    name: "Web3 Pioneer",
    description: "Complete a Web3 development course",
    category: "skill_mastery",
    criteria: {
      type: "skill_completion",
      value: 1,
      skillArea: "web3",
    },
    pointsReward: 150,
    rarity: "rare",
  },
  {
    name: "Point Collector",
    description: "Earn 1000 points",
    category: "engagement",
    criteria: {
      type: "points_threshold",
      value: 1000,
    },
    pointsReward: 100,
    rarity: "rare",
  },
  {
    name: "Elite Learner",
    description: "Earn 5000 points",
    category: "engagement",
    criteria: {
      type: "points_threshold",
      value: 5000,
    },
    pointsReward: 500,
    rarity: "epic",
  },
  {
    name: "Legend",
    description: "Earn 10000 points",
    category: "engagement",
    criteria: {
      type: "points_threshold",
      value: 10000,
    },
    pointsReward: 1000,
    rarity: "legendary",
  },
]

async function seedBadges() {
  try {
    console.log("Seeding badges...")

    for (const badgeData of defaultBadges) {
      const existingBadge = await Badge.findOne({ name: badgeData.name })
      if (!existingBadge) {
        await Badge.create(badgeData)
        console.log(`Created badge: ${badgeData.name}`)
      } else {
        console.log(`Badge already exists: ${badgeData.name}`)
      }
    }

    console.log("Badge seeding completed!")
  } catch (error) {
    console.error("Error seeding badges:", error)
  }
}

module.exports = { seedBadges, defaultBadges }
