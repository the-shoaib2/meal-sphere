'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Utensils, Clock, Users, Flame } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type Meal = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
  tags: string[];
  calories: number | null;
  servings: number | null;
};

type GroupMealsProps = {
  groupId: string;
  isAdmin: boolean;
};

export function GroupMeals({ groupId, isAdmin }: GroupMealsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [meals, setMeals] = useState<Meal[]>([
    {
      id: '1',
      name: 'Pasta Carbonara',
      description: 'Classic Italian pasta with eggs, cheese, pancetta, and black pepper.',
      image: null,
      createdAt: new Date().toISOString(),
      createdBy: {
        id: '1',
        name: 'John Doe',
        image: null,
      },
      tags: ['Italian', 'Pasta', 'Dinner'],
      calories: 750,
      servings: 2,
    },
    {
      id: '2',
      name: 'Vegetable Stir Fry',
      description: 'Healthy mix of fresh vegetables with tofu in a savory sauce.',
      image: null,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      createdBy: {
        id: '2',
        name: 'Jane Smith',
        image: null,
      },
      tags: ['Vegetarian', 'Asian', 'Healthy'],
      calories: 450,
      servings: 3,
    },
  ]);

  const filteredMeals = meals.filter((meal) =>
    meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meal.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meal.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Group Meals</CardTitle>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search meals..."
              className="pl-8 w-[200px] lg:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button asChild>
            <Link href={`/meals/create?groupId=${groupId}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Meal
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredMeals.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Utensils className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No meals yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Get started by adding the first meal to this group.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/meals/create?groupId=${groupId}`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Meal
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMeals.map((meal) => (
              <div
                key={meal.id}
                className="group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md"
              >
                <div className="aspect-video w-full bg-muted flex items-center justify-center">
                  {meal.image ? (
                    <img
                      src={meal.image}
                      alt={meal.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Utensils className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg leading-none">
                      {meal.name}
                    </h3>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{format(new Date(meal.createdAt), 'MMM d')}</span>
                    </div>
                  </div>
                  
                  {meal.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {meal.description}
                    </p>
                  )}
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {meal.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Flame className="h-4 w-4 text-amber-500" />
                        <span>{meal.calories || 'N/A'} cal</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>{meal.servings || 'N/A'} servings</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                          {meal.createdBy.name?.charAt(0) || 'U'}
                        </div>
                      </div>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {meal.createdBy.name}
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/meals/${meal.id}`}
                  className="absolute inset-0"
                  aria-label={`View ${meal.name} details`}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
