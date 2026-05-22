const SEED_SOURCES = [

  // ── School Districts ──────────────────────────────────────────────────────
  { name: 'Seattle Public Schools — School Year Dates',         url: 'https://www.seattleschools.org/news/school-calendar/',                                                                                category: 'district' },
  { name: 'Seattle Public Schools — Full Calendar',             url: 'https://www.seattleschools.org/calendar/',                                                                                            category: 'district' },
  { name: 'Seattle Public Schools — Enrollment',                url: 'https://www.seattleschools.org/enroll/enroll-my-student/',                                                                            category: 'district' },
  { name: 'Seattle Public Schools — PreK/Early Childhood',      url: 'https://www.seattleschools.org/departments/early-learning/preschool/',                                                               category: 'district' },
  { name: 'Seattle Preschool Program — City of Seattle',        url: 'https://www.seattle.gov/education/for-parents/child-care-and-preschool/seattle-preschool-program',                                   category: 'district' },
  { name: 'Bellevue School District — Academic Calendar',       url: 'https://www.bsd405.org/about-us/calendar',                                                                                           category: 'district' },
  { name: 'Bellevue School District — Enrollment',              url: 'https://www.bsd405.org/enroll/enrollment-process',                                                                                   category: 'district' },
  { name: 'Bellevue School District — Preschool Enrollment',    url: 'https://www.bsd405.org/enroll/preschool',                                                                                            category: 'district' },

  // ── Preschools ────────────────────────────────────────────────────────────
  { name: 'French American School of Puget Sound',              url: 'https://www.fasps.org/capitol-hill-preschool-campus',                                                                                category: 'preschool' },
  { name: 'Hilltop Children\'s Center — Queen Anne',            url: 'https://hilltopcc.com/inquires/',                                                                                                    category: 'preschool' },
  { name: 'The Little School',                                  url: 'https://info.thelittleschool.org/request-info',                                                                                      category: 'preschool' },
  { name: 'KinderCare — Enrollment',                            url: 'https://www.kindercare.com/how-to-enroll',                                                                                           category: 'preschool' },
  { name: 'Bright Horizons — South Lake Union',                 url: 'https://child-care-preschool.brighthorizons.com/wa/seattle/slu',                                                                     category: 'preschool' },

  // ── Summer Camps ──────────────────────────────────────────────────────────
  { name: 'Woodland Park Zoo — Summer Camps',                   url: 'https://zoo.org/camps/',                                                                                                             category: 'camp' },
  { name: 'YMCA Seattle — Day Camp',                            url: 'https://www.seattleymca.org/programs/camp-and-outdoor-leadership/day-camp',                                                          category: 'camp' },
  { name: 'YMCA Eastside — Summer Day Camp',                    url: 'https://www.seattleymca.org/programs/camp-and-outdoor-leadership/day-camp/region/east',                                              category: 'camp' },
  { name: 'Camp Orkila — Overnight Summer Camp',                url: 'https://www.seattleymca.org/programs/camp-and-outdoor-leadership/camp-orkila/overnight-camp',                                        category: 'camp' },
  { name: 'Seattle Parks — Summer Programs Registration',       url: 'https://anc.apm.activecommunities.com/seattle/activity/search?activity_category_ids=22',                                            category: 'camp' },
  { name: 'Bellevue Parks — Summer Day Camps',                  url: 'https://register.bellevuewa.gov',                                                                                                   category: 'camp' },
  { name: 'iD Tech Camps — UW Seattle',                        url: 'https://www.idtech.com/locations/washington-summer-camps/uw-seattle',                                                                category: 'camp' },
  { name: 'Camp Galileo — Seattle',                             url: 'https://galileo-camps.com/our-camps/seattle-locations/',                                                                             category: 'camp' },
  { name: 'Pacific Science Center — Camps',                     url: 'https://pacificsciencecenter.org/education/camps/',                                                                                  category: 'camp' },
  { name: 'DigiPen Academy — Summer Programs',                  url: 'https://academy.digipen.edu/pre-college-summer-arts-technology-programs/',                                                           category: 'camp' },

  // ── After School ──────────────────────────────────────────────────────────
  { name: 'YMCA Seattle — Before & After School',               url: 'https://www.seattleymca.org/programs/child-care-and-school-enrichment/before-after-school-enrichment',                               category: 'afterschool' },
  { name: 'YMCA Eastside — Child Care & Enrichment',            url: 'https://www.seattleymca.org/programs/child-care-and-enrichment',                                                                     category: 'afterschool' },
  { name: 'Boys & Girls Clubs of King County',                  url: 'https://bgckingcountymch.my.site.com/portal/s/registration?language=en_US',                                                          category: 'afterschool' },
  { name: 'Boys & Girls Clubs of Bellevue',                     url: 'https://www.bgcbellevue.org/Programs',                                                                                              category: 'afterschool' },
  { name: 'Seattle Parks — Childcare & After-School',           url: 'https://www.seattle.gov/parks/learning-and-childcare/childcare-and-preschool',                                                       category: 'afterschool' },

  // ── Tutoring ──────────────────────────────────────────────────────────────
  { name: 'Kumon — Bellevue Downtown',                          url: 'https://www.kumon.com/bellevue-downtown-wa/scheduler',                                                                               category: 'tutoring' },
  { name: 'Mathnasium — NW Seattle',                            url: 'https://www.mathnasium.com/math-centers/northwestseattle',                                                                           category: 'tutoring' },
  { name: 'Mathnasium — Bellevue',                              url: 'https://www.mathnasium.com/math-centers/bellevue',                                                                                   category: 'tutoring' },
  { name: 'Sylvan Learning — Bellevue',                         url: 'https://www.sylvanlearning.com/locations/us/wa/bellevue-tutoring/bellevue/',                                                         category: 'tutoring' },

  // ── Enrichment ────────────────────────────────────────────────────────────
  { name: 'Russian School of Mathematics — Bellevue',           url: 'https://www.mathschool.com/locations/bellevue',                                                                                      category: 'enrichment' },
  { name: 'Girls Who Code — Clubs Program',                     url: 'https://girlswhocode.com/programs/clubs-program',                                                                                    category: 'enrichment' },
  { name: 'FIRST Washington — FLL Registration',                url: 'https://firstwa.org/challenge-registration/',                                                                                        category: 'enrichment' },
  { name: 'Seattle Children\'s Theatre — Camps & Classes',      url: 'https://www.sct.org/education-programs/camps-classes-sct/',                                                                          category: 'enrichment' },
  { name: 'Music Center of the Northwest',                      url: 'https://www.musiccenternw.org/get-started',                                                                                          category: 'enrichment' },
  { name: 'Gage Academy of Art — Youth Programs',               url: 'https://gageacademy.org/youth-classes',                                                                                             category: 'enrichment' },
  { name: 'Seattle Art Museum — SAM Camp',                      url: 'https://www.seattleartmuseum.org/whats-on/programs/sam-camp',                                                                        category: 'enrichment' },
  { name: 'Seattle Symphony — Families & Education',            url: 'https://www.seattlesymphony.org/education-and-community/families/',                                                                  category: 'enrichment' },

  // ── Activities ────────────────────────────────────────────────────────────
  { name: 'Woodland Park Zoo — Youth Programs',                 url: 'https://zoo.org/today/youthprograms/',                                                                                               category: 'activity' },
  { name: 'Pedalheads Seattle',                                 url: 'https://pedalheads.com/en/washington',                                                                                              category: 'activity' },
  { name: 'Seattle Parks — Swim Lessons',                       url: 'https://www.seattle.gov/parks/pools/swim-seattle',                                                                                   category: 'activity' },
  { name: 'Bellevue Parks — Swim Lessons',                      url: 'https://bellevuewa.gov/city-government/departments/parks/sports-and-athletics/bellevue-aquatic-center/swim-lessons-and-programs',    category: 'activity' },
  { name: 'Seattle Gymnastics Academy',                         url: 'https://seattlegymnastics.com/recreational-classes/',                                                                                category: 'activity' },
  { name: 'Eastside FC — Youth Soccer',                         url: 'https://www.eastsidefc.org/tryouts',                                                                                                category: 'activity' },
  { name: 'Seattle Parks — Youth Sports',                       url: 'https://www.seattle.gov/parks/recreation/sports/youth-sports',                                                                       category: 'activity' },

  // ── Community ─────────────────────────────────────────────────────────────
  { name: 'Seattle Parks & Recreation — Programs',              url: 'https://www.seattle.gov/parks/recreation',                                                                                           category: 'community' },
  { name: 'Bellevue Parks & Community Services',                url: 'https://bellevuewa.gov/city-government/departments/parks/connections',                                                               category: 'community' },
  { name: 'ParentMap — Seattle Events Calendar',                url: 'https://www.parentmap.com/calendar',                                                                                                category: 'community' },
];

function seedSources(db) {
  const insertStmt = db.prepare(`
    INSERT INTO sources (name, url, category)
    SELECT @name, @url, @category
    WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = @url)
  `);

  let inserted = 0;
  let skipped  = 0;

  const seedAll = db.transaction((sources) => {
    for (const s of sources) {
      const result = insertStmt.run({ name: s.name, url: s.url, category: s.category });
      if (result.changes > 0) inserted++;
      else skipped++;
    }
  });

  seedAll(SEED_SOURCES);
  return { inserted, skipped };
}

module.exports = { seedSources, SEED_SOURCES };
