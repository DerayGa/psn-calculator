import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Sort } from '@angular/material';

export interface Game {
  name: string;
  price: number;
}

@Component({
  selector:    'app-root',
  templateUrl: './app.component.html',
  styleUrls:   ['./app.component.css']
})
export class AppComponent {

  games: Game[];
  sortedData: Game[];
  shoppingCart: Game[]    = [];
  trashCart: Game[]       = [];
  combination: Array<any> = [];
  targetPrice             = 2200;
  totalPrice              = 0;
  message                 = '';

  constructor(
    private http: HttpClient
  ) {
    this.getGameList();
  }

  calculator() {
    this.message = '';
    this.combination = [];
    if (this.totalPrice > this.targetPrice) {
      this.message = `購物車金額 ${this.totalPrice}元，超過目標金額 ${this.targetPrice}元`;
    } else if (this.totalPrice === this.targetPrice) {
      this.message = `你已經挑好 ${this.targetPrice}元了`;
    } else {
      const games = this.sortedData.filter((game) => (
        this.trashCart.find(target => target.name === game.name) === undefined
      )).filter((game) => (
        this.shoppingCart.find(target => target.name === game.name) === undefined
      ));

      const targetPrice = this.targetPrice - this.totalPrice;
      const priceList = [];
      games.forEach((game) => {
        if (game.price <= targetPrice && priceList.indexOf(game.price) < 0) {
          priceList.push(game.price);
        }
      });
      priceList.sort((a, b) => (a - b));

      this.combination = this.getSummingItems(priceList, targetPrice);

      if (this.combination === undefined || this.combination.length === 0) {
        this.message = '抱歉捏，湊不到整數。';
      } else {
        this.message = this.combination.filter((combination, index) => index < 20)
          .map((combination, index) => {
          const set: Array<string> = combination.map((price) => {
            const priceMatchGames = games.filter((game) => (game.price === price));
            if (priceMatchGames.length === 1) {
              const game = priceMatchGames[0];
              return `${game.price} : ${game.name}`;
            }

            return `${priceMatchGames[0].price} : ` + priceMatchGames.map((game) => (
              game.name
            )).join(` /\r\n      `);
          });
          set.unshift(`第${index + 1}種組合`);
          set.push('');

          return set.join('\r\n');
        }).join('\r\n');
      }
    }
  }

  getSummingItems(priceList, targetPrice) {
    return priceList.reduce((h, price) => Object.keys(h)
      .reduceRight((m, k) => +k + price <= targetPrice
        ? (m[+k + price] = m[+k + price]
          ? m[+k + price].concat(m[k].map(sa => sa.concat(price)))
          : m[k].map(sa => sa.concat(price)), m)
        : m, h
      ), { 0: [[]] })[targetPrice];
  }

  getPrice() {
    if (this.shoppingCart.length === 0) {
      return '';
    }
    this.totalPrice = 0;

    this.shoppingCart.forEach((game) => {
      this.totalPrice += game.price;
    });

    return `已選購金額：${this.totalPrice}`;
  }

  getCart() {
    if (this.shoppingCart.length === 0) {
      return '';
    }
    const games: string[] = [];

    this.shoppingCart.forEach((game) => {
      games.push(`${game.name} : ${game.price}`);
    });

    return games.join('\r\n');
  }

  getCount() {
    if (!this.combination || this.combination.length === 0) {
      return '';
    }

    let count = `一共有${this.combination.length}種組合`;
    if (this.combination.length > 20) {
      count += `，只顯示其中的20種。`;
    }
    return count;
  }

  getResult() {
    return this.message;
  }

  reset() {
    window.location.reload();
  }

  getGameList() {
    this.games = [];
    this.http.get('./assets/game.json').subscribe((result: Array<any>) => {
      result.forEach((game) => {
        this.games.push({
          name:  game[0],
          price: game[1]
        });
      });
      this.sortedData = this.games.slice();
    });
  }

  sortData(sort: Sort) {
    const data = this.games.slice();
    if (!sort.active || sort.direction === '') {
      this.sortedData = data;
      return;
    }

    this.sortedData = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'name':
          return compare(a.name, b.name, isAsc);
        case 'price':
          return compare(a.price, b.price, isAsc);
        default:
          return 0;
      }
    });
  }

  include(name) {
    const target = this.games.find(game => game.name === name);

    this.shoppingCart.push(target);

    const exclude = this.trashCart.find(game => game.name === name);
    if (exclude && this.trashCart.indexOf(exclude) >= 0) {
      this.trashCart.splice(this.trashCart.indexOf(exclude), 1);
    }
  }

  exclude(name) {
    const target = this.games.find(game => game.name === name);

    this.trashCart.push(target);

    const include = this.shoppingCart.find(game => game.name === name);
    if (include && this.shoppingCart.indexOf(include) >= 0) {
      this.shoppingCart.splice(this.shoppingCart.indexOf(include), 1);
    }
  }
}

function compare(a, b, isAsc) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
