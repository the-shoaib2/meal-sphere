
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, AlertTriangle, CheckCircle2, Server, Database, Activity } from 'lucide-react';

export default function BenchmarkPage() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const runBenchmark = async () => {
        setLoading(true);
        setError(null);
        try {
            // Force a real network request by ignoring cache
            const res = await fetch('/api/benchmark', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to run benchmark');
            const data = await res.json();
            setResults(data.results);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'LIGHTNING':
            case 'EXCELLENT':
                return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'GOOD':
                return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'SLOW':
                return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'LAGGY':
                return 'text-red-500 bg-red-500/10 border-red-500/20';
            default:
                return 'text-gray-500';
        }
    };

    const ResultCard = ({ title, icon: Icon, data, description }: any) => {
        if (!data) return null;
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold flex items-center gap-2">
                        {data.timeMs}ms
                        <Badge variant="outline" className={getStatusColor(data.status)}>
                            {data.status}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {description || 'Execution time'}
                    </p>
                    {data.count !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                            PROCESSED: {data.count} items
                        </p>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Benchmark</h1>
                    <p className="text-muted-foreground">Test the performance of your API and Database optimizations</p>
                </div>
                <Button onClick={runBenchmark} disabled={loading} size="lg">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running Tests...
                        </>
                    ) : (
                        <>
                            <Zap className="mr-2 h-4 w-4" />
                            Run Benchmark
                        </>
                    )}
                </Button>
            </div>

            {error && (
                <Card className="border-red-500/50 bg-red-500/10">
                    <CardHeader>
                        <CardTitle className="text-red-500 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Benchmark Failed
                        </CardTitle>
                        <CardDescription className="text-red-500/90">{error}</CardDescription>
                    </CardHeader>
                </Card>
            )}

            {!results && !loading && !error && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <Activity className="h-12 w-12 mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">Ready to Test</h3>
                    <p>Click "Run Benchmark" to measure API performance.</p>
                </div>
            )}

            {results && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <ResultCard
                            title="Database Latency"
                            icon={Database}
                            data={results.databaseLatency}
                            description="Connection roundtrip"
                        />
                        <ResultCard
                            title="Groups API"
                            icon={Server}
                            data={results.groups}
                            description="Fetch & Process User Groups"
                        />
                        <ResultCard
                            title="Dashboard Summary"
                            icon={Activity}
                            data={results.dashboard}
                            description="Complex parallel aggregation"
                        />
                        <ResultCard
                            title="Account Calculations"
                            icon={CheckCircle2}
                            data={results.balance}
                            description="Transaction sorting & summing"
                        />
                        <ResultCard
                            title="Meals Fetch"
                            icon={Server}
                            data={results.meals}
                            description="Fetch date-filtered meals"
                        />
                        <ResultCard
                            title="Expenses Fetch"
                            icon={Server}
                            data={results.expenses}
                            description="Fetch extra expenses"
                        />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Report</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs font-mono">
                                {JSON.stringify(results, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
