'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Heart, Plus, Send, Users, TrendingUp } from 'lucide-react';
import axios, { apiRoutes } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function CommunityPage() {
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');

  const { data: postsData } = useQuery({
    queryKey: ['community-posts'],
    queryFn: () => axios.get(apiRoutes.community.posts).then(r => r.data.data),
  });

  const createPost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    try {
      await axios.post(apiRoutes.community.posts, { title: newPostTitle, content: newPostContent });
      qc.invalidateQueries({ queryKey: ['community-posts'] });
      setNewPostTitle('');
      setNewPostContent('');
      setShowForm(false);
      toast.success('Post created!');
    } catch { toast.error('Failed to create post'); }
  };

  const addComment = async (postId: string) => {
    if (!commentContent.trim()) return;
    try {
      await axios.post(`${apiRoutes.community.posts}/${postId}/comments`, { content: commentContent });
      qc.invalidateQueries({ queryKey: ['community-posts'] });
      setCommentContent('');
      setActiveComment(null);
      toast.success('Comment added!');
    } catch { toast.error('Failed to add comment'); }
  };

  const react = async (postId: string) => {
    if (!isAuthenticated) { toast.error('Please log in to react'); return; }
    try {
      await axios.post(`${apiRoutes.community.posts}/${postId}/react`, { type: 'LIKE' });
      qc.invalidateQueries({ queryKey: ['community-posts'] });
    } catch {}
  };

  const posts = postsData?.posts || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Community</h1>
            <p className="text-muted-foreground">Connect, share, and learn together</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowForm(f => !f)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> New Post
            </button>
          )}
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-xl p-4 mb-6 space-y-3"
          >
            <input
              value={newPostTitle}
              onChange={e => setNewPostTitle(e.target.value)}
              placeholder="Post title..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <textarea
              rows={3}
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">
                Cancel
              </button>
              <button
                onClick={createPost}
                className="text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-lg"
              >
                Post
              </button>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          {posts.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No posts yet</h3>
              <p className="text-sm text-muted-foreground">Be the first to start a discussion!</p>
            </div>
          )}

          {posts.map((post: any) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {post.author?.firstName} {post.author?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
                  </div>
                  <h3 className="font-semibold mt-1">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{post.content}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1 border-t">
                <button
                  onClick={() => react(post.id)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Heart className="h-4 w-4" />
                  <span>{post._count?.reactions || 0}</span>
                </button>
                <button
                  onClick={() => setActiveComment(activeComment === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{post._count?.comments || 0}</span>
                </button>
              </div>

              {activeComment === post.id && isAuthenticated && (
                <div className="flex gap-2 pt-1">
                  <input
                    value={commentContent}
                    onChange={e => setCommentContent(e.target.value)}
                    placeholder="Write a comment..."
                    onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => addComment(post.id)}
                    className="text-primary hover:text-primary/80"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
