import { Metadata } from 'next';
import { Award, CheckCircle, Calendar, User, BookOpen, Share2 } from 'lucide-react';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Certificate Verification — ${params.id} | LearnHub`,
    description: 'Verify this LearnHub certificate',
  };
}

export default function CertificateVerifyPage({ params }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Certificate */}
        <div className="certificate-container mb-6">
          <div className="certificate-inner p-12 text-center relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500 rounded-full translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Award className="w-9 h-9 text-white" />
                </div>
              </div>

              <p className="text-gray-500 text-sm uppercase tracking-widest mb-2 font-medium">Certificate of Completion</p>
              <p className="text-gray-500 mb-6">This is to certify that</p>

              <h2 className="text-3xl font-bold text-gray-800 mb-2">Learner Name</h2>
              <p className="text-gray-500 mb-6">has successfully completed</p>

              <h1 className="text-2xl font-bold text-blue-700 mb-6 max-w-md mx-auto leading-tight">
                Course Title Placeholder
              </h1>

              <p className="text-gray-500 mb-8">on LearnHub — an online learning platform</p>

              <div className="flex justify-center items-center gap-12">
                <div className="text-center">
                  <div className="w-24 h-0.5 bg-gray-300 mb-2" />
                  <p className="text-xs text-gray-500">Instructor</p>
                  <p className="text-sm font-medium">Instructor Name</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-xs text-gray-500">QR Verified</p>
                </div>
                <div className="text-center">
                  <div className="w-24 h-0.5 bg-gray-300 mb-2" />
                  <p className="text-xs text-gray-500">Date Issued</p>
                  <p className="text-sm font-medium">June 2024</p>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-6">Certificate ID: {params.id}</p>
            </div>
          </div>
        </div>

        {/* Verification info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Certificate Verified</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Student</p>
                <p className="font-medium">Learner Name</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Course</p>
                <p className="font-medium">Course Title</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Issued On</p>
                <p className="font-medium">June 2024</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Download PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
