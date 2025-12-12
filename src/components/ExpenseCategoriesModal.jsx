import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ApiService from '@/services/api';
import { Trash2, Plus } from 'lucide-react';

export default function ExpenseCategoriesModal({ userId, open, onOpenChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState({ category: '', subcategory: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(new Set());

  useEffect(() => {
    if (open && userId) {
      loadCategories();
    }
  }, [open, userId]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getExpenseCategories(userId);
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.category.trim() || !newCategory.subcategory.trim()) {
      return;
    }

    try {
      setSaving(true);
      await ApiService.createExpenseCategory({
        category: newCategory.category.trim(),
        subcategory: newCategory.subcategory.trim(),
      });
      setNewCategory({ category: '', subcategory: '' });
      await loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      alert(error.message || 'Failed to add category. It may already exist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      setDeleting(prev => new Set(prev).add(categoryId));
      await ApiService.deleteExpenseCategory(categoryId);
      await loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.message || 'Failed to delete category.');
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryId);
        return newSet;
      });
    }
  };

  // Sort categories: user-specific first, then by category and subcategory
  const sortedCategories = [...categories].sort((a, b) => {
    // User-specific first
    if (a.user_id !== b.user_id) {
      return b.user_id - a.user_id; // user_id > 0 comes first
    }
    // Then by category
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    // Then by subcategory
    return a.subcategory.localeCompare(b.subcategory);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Expense Categories & Subcategories</DialogTitle>
          <DialogDescription>
            View all available categories (global and your custom ones). Add new categories to personalize your expense classification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new category form */}
          <div className="flex gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Input
              placeholder="Category (e.g., Hobbies)"
              value={newCategory.category}
              onChange={(e) => setNewCategory({ ...newCategory, category: e.target.value })}
              className="flex-1"
            />
            <Input
              placeholder="Subcategory (e.g., Photography)"
              value={newCategory.subcategory}
              onChange={(e) => setNewCategory({ ...newCategory, subcategory: e.target.value })}
              className="flex-1"
            />
            <Button
              onClick={handleAddCategory}
              disabled={saving || !newCategory.category.trim() || !newCategory.subcategory.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Categories table */}
          {loading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subcategory</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCategories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            cat.user_id === 0
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {cat.user_id === 0 ? 'Global' : 'Custom'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{cat.category}</TableCell>
                      <TableCell>{cat.subcategory}</TableCell>
                      <TableCell>
                        {cat.user_id > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(cat.id)}
                            disabled={deleting.has(cat.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedCategories.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No categories found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

