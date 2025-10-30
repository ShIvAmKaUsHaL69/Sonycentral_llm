/**
 * Interactive Data Formatter for Database Results
 * Provides user-friendly formatting for various data types
 */

export interface FormattedResult {
  summary: string;
  formattedData: string;
  insights: string[];
  metadata: {
    totalRows: number;
    displayedRows: number;
    hasMore: boolean;
  };
}

export class DataFormatter {
  /**
   * Format customer data in an interactive way
   */
  static formatCustomerData(data: any[], columns: string[], totalRows: number, showAll: boolean = false): FormattedResult {
    const displayedRows = showAll ? data.length : Math.min(data.length, 20);
    const hasMore = !showAll && totalRows > displayedRows;
    
    // Generate summary
    const summary = this.generateCustomerSummary(data, totalRows);
    
    // Generate insights
    const insights = this.generateCustomerInsights(data);
    
    // Format the data table
    const formattedData = this.formatCustomerTable(data.slice(0, displayedRows), columns);
    
    return {
      summary,
      formattedData,
      insights,
      metadata: {
        totalRows,
        displayedRows,
        hasMore
      }
    };
  }

  /**
   * Format generic table data
   */
  static formatTableData(data: any[], columns: string[], totalRows: number, tableType?: string, showAll: boolean = false): FormattedResult {
    const displayedRows = showAll ? data.length : Math.min(data.length, 20);
    const hasMore = !showAll && totalRows > displayedRows;
    
    // Generate summary based on table type
    const summary = this.generateGenericSummary(data, totalRows, tableType);
    
    // Generate insights
    const insights = this.generateGenericInsights(data, tableType);
    
    // Format the data table
    const formattedData = this.formatGenericTable(data.slice(0, displayedRows), columns);
    
    return {
      summary,
      formattedData,
      insights,
      metadata: {
        totalRows,
        displayedRows,
        hasMore
      }
    };
  }

  private static generateCustomerSummary(data: any[], totalRows: number): string {
    if (totalRows === 0) {
      return "📊 **No customers found** in the database.";
    }

    // Calculate some basic stats
    const customersWithOrders = data.filter(row => row.orders_count > 0).length;
    const customersWithSpending = data.filter(row => row.total_spent > 0).length;
    const countries = [...new Set(data.map(row => row.country).filter(Boolean))];
    
    let summary = `📊 **Found ${totalRows.toLocaleString()} customer${totalRows === 1 ? '' : 's'}**\n\n`;
    
    if (customersWithOrders > 0) {
      summary += `🛒 ${customersWithOrders} customer${customersWithOrders === 1 ? '' : 's'} have placed orders\n`;
    }
    
    if (customersWithSpending > 0) {
      summary += `💰 ${customersWithSpending} customer${customersWithSpending === 1 ? '' : 's'} have spending history\n`;
    }
    
    if (countries.length > 0) {
      summary += `🌍 Customers from ${countries.length} countr${countries.length === 1 ? 'y' : 'ies'}: ${countries.slice(0, 3).join(', ')}${countries.length > 3 ? ` and ${countries.length - 3} more` : ''}\n`;
    }

    return summary;
  }

  private static generateGenericSummary(data: any[], totalRows: number, tableType?: string): string {
    if (totalRows === 0) {
      return `📊 **No ${tableType || 'records'} found** in the database.`;
    }

    return `📊 **Found ${totalRows.toLocaleString()} ${tableType || 'record'}${totalRows === 1 ? '' : 's'}**`;
  }

  private static generateCustomerInsights(data: any[]): string[] {
    const insights: string[] = [];
    
    if (data.length === 0) return insights;

    // Check for customers with missing information
    const missingNames = data.filter(row => !row.first_name && !row.last_name).length;
    if (missingNames > 0) {
      insights.push(`⚠️ ${missingNames} customer${missingNames === 1 ? '' : 's'} missing name information`);
    }

    // Check for customers with no orders
    const noOrders = data.filter(row => row.orders_count === 0).length;
    if (noOrders > 0) {
      insights.push(`📝 ${noOrders} customer${noOrders === 1 ? '' : 's'} haven't placed any orders yet`);
    }

    // Check for recent customers
    const recentCustomers = data.filter(row => {
      const createdDate = new Date(row.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate > thirtyDaysAgo;
    }).length;
    
    if (recentCustomers > 0) {
      insights.push(`🆕 ${recentCustomers} new customer${recentCustomers === 1 ? '' : 's'} in the last 30 days`);
    }

    // Check for high-value customers
    const highValueCustomers = data.filter(row => row.total_spent > 1000).length;
    if (highValueCustomers > 0) {
      insights.push(`💎 ${highValueCustomers} high-value customer${highValueCustomers === 1 ? '' : 's'} (spent > $1000)`);
    }

    return insights;
  }

  private static generateGenericInsights(data: any[], tableType?: string): string[] {
    const insights: string[] = [];
    
    if (data.length === 0) return insights;

    // Generic insights based on common patterns
    const nullValues = data.filter(row => 
      Object.values(row).some(value => value === null || value === undefined)
    ).length;
    
    if (nullValues > 0) {
      insights.push(`⚠️ ${nullValues} record${nullValues === 1 ? '' : 's'} contain missing data`);
    }

    return insights;
  }

  private static formatCustomerTable(data: any[], columns: string[]): string {
    if (data.length === 0) {
      return "No data to display.";
    }

    // Create a more readable table format
    let table = "```\n";
    
    // Table header
    const headers = [
      "ID", "Name", "Email", "Country", "Orders", "Total Spent", "Joined"
    ];
    
    // Calculate column widths
    const widths = headers.map(h => h.length);
    data.forEach(row => {
      widths[0] = Math.max(widths[0], String(row.id || '').length);
      widths[1] = Math.max(widths[1], this.formatCustomerName(row).length);
      widths[2] = Math.max(widths[2], String(row.email || '').length);
      widths[3] = Math.max(widths[3], String(row.country || '').length);
      widths[4] = Math.max(widths[4], String(row.orders_count || 0).length);
      widths[5] = Math.max(widths[5], this.formatCurrency(row.total_spent || 0).length);
      widths[6] = Math.max(widths[6], this.formatDate(row.created_at).length);
    });

    // Print header
    table += headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + '\n';
    table += '-'.repeat(widths.reduce((a, b) => a + b + 3, 0)) + '\n';

    // Print rows
    data.forEach(row => {
      const values = [
        String(row.id || ''),
        this.formatCustomerName(row),
        String(row.email || ''),
        String(row.country || ''),
        String(row.orders_count || 0),
        this.formatCurrency(row.total_spent || 0),
        this.formatDate(row.created_at)
      ];
      
      table += values.map((v, i) => v.padEnd(widths[i])).join(' | ') + '\n';
    });

    table += "```";
    return table;
  }

  private static formatGenericTable(data: any[], columns: string[]): string {
    if (data.length === 0) {
      return "No data to display.";
    }

    let table = "```\n";
    
    // Calculate column widths
    const widths = columns.map(col => col.length);
    data.forEach(row => {
      columns.forEach((col, i) => {
        const value = row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL';
        widths[i] = Math.max(widths[i], value.length);
      });
    });

    // Print header
    table += columns.map((col, i) => col.padEnd(widths[i])).join(' | ') + '\n';
    table += '-'.repeat(widths.reduce((a, b) => a + b + 3, 0)) + '\n';

    // Print rows
    data.forEach(row => {
      const values = columns.map(col => {
        const value = row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL';
        return value;
      });
      
      table += values.map((v, i) => v.padEnd(widths[i])).join(' | ') + '\n';
    });

    table += "```";
    return table;
  }

  private static formatCustomerName(row: any): string {
    const firstName = row.first_name || '';
    const lastName = row.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      return 'N/A';
    }
  }

  private static formatCurrency(amount: number): string {
    if (amount === 0) return '$0.00';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private static formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Invalid Date';
    }
  }

  /**
   * Create a complete formatted response
   */
  static createFormattedResponse(
    data: any[], 
    columns: string[], 
    totalRows: number, 
    tableType?: string,
    showSummary: boolean = false,
    showAll: boolean = false
  ): string {
    const result = tableType === 'customers' 
      ? this.formatCustomerData(data, columns, totalRows, showAll)
      : this.formatTableData(data, columns, totalRows, tableType, showAll);

    let response = '';
    
    if (showSummary) {
      response += result.summary + '\n\n';
      
      if (result.insights.length > 0) {
        response += '**Key Insights:**\n';
        result.insights.forEach(insight => {
          response += `• ${insight}\n`;
        });
        response += '\n';
      }
    }
    
    response += '**Data:**\n';
    response += result.formattedData;
    
    if (result.metadata.hasMore) {
      response += `\n\n*Showing ${result.metadata.displayedRows} of ${result.metadata.totalRows} records. Use specific filters to see more data.*`;
    }

    return response;
  }

  /**
   * Create a simple formatted response (data only, no summary/insights)
   */
  static createSimpleFormattedResponse(
    data: any[], 
    columns: string[], 
    totalRows: number, 
    tableType?: string,
    showAll: boolean = false
  ): string {
    return this.createFormattedResponse(data, columns, totalRows, tableType, false, showAll);
  }
}
