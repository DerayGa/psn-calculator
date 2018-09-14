import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Sort } from '@angular/material';
import { FormControl } from '@angular/forms';

export interface Game {
  name: string;
  price: number;
  normal_price: number;
  plus_price: number;
  platforms: Array<string>;
}

@Component({
  selector:    'app-root',
  templateUrl: './app.component.html',
  styleUrls:   ['./app.component.css']
})
export class AppComponent {

  toppings = new FormControl();

  games: Game[]               = [];
  sortedData: Game[]          = [];
  shoppingCart: Game[]        = [];
  trashCart: Game[]           = [];
  combination: Array<any>     = [];
  gameName: Array<string>     = [];
  jsonList: Array<string>     = [
    'game_50.json',
    /*'game_100.json',
    'game_150.json',
    /*'game_200.json',
    'game_250.json',
    'game_300.json',
    'game_350.json',
    'game_400.json',*/
  ];
  platformList: Array<string> = [
    'PS4',
    'PS Vita',
    'PS3',
  ];
  targetPrice                 = 2200;
  totalPrice                  = 0;
  message                     = '';
  isPlus                      = true;
  priceList: Array<number>    = [];

  constructor(
    private http: HttpClient
  ) {
    this.toppings.setValue(['PS4']);
    this.isPlus = localStorage.getItem('is-plus') !== 'false';

    this.getGameList();
  }

  calculator() {
    this.message     = '';
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

      this.priceList = [];
      games.forEach((game) => {
        if (this.priceList.indexOf(game.price) < 0) {
          this.priceList.push(game.price);
        }
      });
      this.priceList.sort((a, b) => (a - b));
      console.log(games.length);
      console.log(this.priceList.length);

      this.combination = this.getSummingItems();

      if (this.combination === undefined || this.combination.length === 0) {
        this.message = '抱歉捏，湊不到整數。';
      } else {
        this.message = this.combination.filter((combination, index) => index < 20)
          .map((combination, index) => {
            const set: Array<string> = combination.map((price: number) => {
              const priceMatchGames = games.filter((game) => game.price === price);
              if (priceMatchGames.length === 1) {
                const game = priceMatchGames[0];
                return `${game.price}: ${game.name}`;
              } else {
                return `${priceMatchGames[0].price}: ${priceMatchGames.map((game) => game.name).join(' /\r\n     ')}`;
              }
            });
            set.unshift(`第${index + 1}種組合`);
            set.push('');

            return set.join('\r\n');
          }).join('\r\n');
      }
    }
  }

  getSummingItems() {
    const target = this.targetPrice - this.totalPrice;
    const values = this.priceList.slice();
    let index = 0;
    while (values.length > 40) {
      values.splice(Math.floor(Math.random() * values.length), 1)
      index++;
      if (index > 100) {
        console.log('XXX');
        break;
      }
    }
    return values.reduce((h, price: number) => (
      Object.keys(h).reduceRight((m, k) => +k + price <= target
        ? (m[+k + price] = m[+k + price]
          ? m[+k + price].concat(m[k].map(sa => sa.concat(price)))
          : m[k].map(sa => sa.concat(price)), m)
        : m, h
      )
    ), { 0: [[]] })[target];
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

  platformSelectionChange() {
    this.sortedData = this.games.filter((game) => (
      this.toppings.value.indexOf(game.platforms[0]) >= 0
    )).slice();
  }

  onIsPlusChange(event): void {
    this.isPlus = event.checked;
    localStorage.setItem('is-plus', String(this.isPlus));

    this.sortedData = this.games.map((game) => {
      game.price = this.isPlus ? game.plus_price : game.normal_price;
      return game;
    }).slice();
  }

  getResult() {
    return this.message;
  }

  reset() {
    window.location.reload();
  }

  getGameList() {
    if (this.jsonList.length === 0) {
      this.sortedData = this.games.slice();
      return;
    }
    const filename = this.jsonList.shift();
    this.http.get(`./assets/${filename}`).subscribe((result: Array<any>) => {
      result['included'].forEach((item) => {
        if (item['type'] === 'game') {
          const attributes = item['attributes'];
          const skus       = attributes['skus'][0];
          const name       = `${attributes['name']}  (${skus['name']})`;

          if (this.gameName.indexOf(name) < 0) {
            this.gameName.push(name);

            const normal_price = skus['prices']['non-plus-user']['actual-price']['value'] / 100;
            const plus_price   = skus['prices']['plus-user']['actual-price']['value'] / 100;
            const price        = this.isPlus ? plus_price : normal_price;

            this.games.push({
              name:         name,
              price:        price,
              normal_price: normal_price,
              plus_price:   plus_price,
              platforms:    attributes['platforms']
            });
          }
        }
      });
      this.getGameList();
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
