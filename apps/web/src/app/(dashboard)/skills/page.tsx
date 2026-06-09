'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';

interface UserSkill {
  skillId: string;
  skill: { name: string; description?: string };
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  score: number;
}

interface SkillGap {
  skill: { id: string; name: string };
  requiredLevel: string;
  currentLevel: string | null;
  courses: any[];
}

const PROFICIENCY_COLOR: Record<string, string> = {
  EXPERT: 'bg-purple-100 text-purple-700',
  ADVANCED: 'bg-blue-100 text-blue-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  BEGINNER: 'bg-gray-100 text-gray-600',
};

const PROFICIENCY_BAR: Record<string, number> = {
  EXPERT: 100, ADVANCED: 75, INTERMEDIATE: 50, BEGINNER: 25,
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/skills/my-skills').catch(() => ({ data: { data: [] } })),
      api.get('/skills/gaps').catch(() => ({ data: { data: [] } })),
    ]).then(([skillsRes, gapsRes]) => {
      setSkills(skillsRes.data.data || []);
      setGaps(gapsRes.data.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Skills</h1>
        <p className="text-gray-500 mt-1">Track your proficiency and identify growth areas.</p>
      </div>

      {/* Current Skills */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Acquired Skills</h2>
        {skills.length === 0 ? (
          <p className="text-gray-400">Complete courses to earn skills.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {skills.map((us) => (
              <div key={us.skillId} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{us.skill.name}</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PROFICIENCY_COLOR[us.proficiency]}`}>
                    {us.proficiency}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${PROFICIENCY_BAR[us.proficiency]}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Score: {us.score.toFixed(0)}/100</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skill Gaps */}
      {gaps.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Skill Gaps & Recommendations</h2>
          <div className="space-y-4">
            {gaps.map((gap) => (
              <div key={gap.skill.id} className="bg-orange-50 border border-orange-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-orange-500">⚡</span>
                  <h3 className="font-semibold text-gray-900">{gap.skill.name}</h3>
                  <span className="text-xs text-gray-400">
                    {gap.currentLevel ? `${gap.currentLevel} → ${gap.requiredLevel}` : `Needs ${gap.requiredLevel}`}
                  </span>
                </div>
                {gap.courses.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recommended courses</p>
                    {gap.courses.slice(0, 2).map((course: any) => (
                      <a
                        key={course.id}
                        href={`/courses/${course.slug}`}
                        className="flex items-center gap-3 bg-white rounded-lg p-3 hover:shadow-sm transition-shadow"
                      >
                        {course.thumbnail && (
                          <div className="relative w-12 h-9 rounded overflow-hidden flex-shrink-0">
                            <Image src={course.thumbnail} alt={course.title} fill sizes="48px" className="object-cover" loading="lazy" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800">{course.title}</p>
                          <p className="text-xs text-indigo-600">{course.isFree ? 'Free' : `$${(course.price / 100).toFixed(2)}`}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
