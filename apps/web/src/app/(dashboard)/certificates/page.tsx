'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Certificate {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  course: { title: string; thumbnail?: string };
  pdfUrl?: string;
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/certificates/my-certificates').then((r) => {
      setCerts(r.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Certificates</h1>
        <p className="text-gray-500 mt-1">Certificates earned by completing courses.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : certs.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-gray-400 text-lg">No certificates yet. Complete a course to earn one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {certs.map((cert) => (
            <div key={cert.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gradient-to-br from-emerald-500 to-purple-600 p-8 text-white text-center">
                <div className="text-4xl mb-3">🎓</div>
                <p className="text-sm font-medium opacity-80 uppercase tracking-widest mb-1">Certificate of Completion</p>
                <h3 className="text-lg font-bold">{cert.course.title}</h3>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>#{cert.certificateNumber}</span>
                  <span>{new Date(cert.issuedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-3">
                  <a
                    href={`/certificates/${cert.id}`}
                    className="flex-1 text-center bg-emerald-50 text-emerald-600 rounded-xl py-2 text-sm font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    View
                  </a>
                  {cert.pdfUrl && (
                    <a
                      href={cert.pdfUrl}
                      download
                      className="flex-1 text-center bg-gray-50 text-gray-600 rounded-xl py-2 text-sm font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
